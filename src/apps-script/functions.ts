/// <reference types="google-apps-script" />

import * as daily from "@/daily";
import {
  exchangeVerificationCode,
  extractVerificationCode,
  formatPhoneNumber,
} from "@/hang";
import { formatError } from "@/tasks";
import { renderSetupDialog } from "./setup-dialog" with { type: "macro" };
import {
  DEFAULT_DAILY_RUN_HOUR,
  formatRunHour,
  INITIAL_FORM_ID,
  parseRunHour,
  type ProvisionResult,
  type SetupDialogInitial,
  type SetupErrors,
  type SetupForm,
  type SetupResult,
  type WebhookAppearanceErrors,
  type WebhookAppearanceForm,
  type WebhookAppearanceResult,
} from "./setup-dialog/shared";

// Apps Script refers to these by name, so they must match the exports below.
const RUN_DAILY_TASKS = "runDailyTasks";
const SET_UP = "setUp";
const ON_FORM_SUBMIT = "onFormSubmit";
const CHECK_FOR_UPDATES = "checkForUpdates";

const TITLE = "Cidercade Completer";

/** Provided by updater.gs (not part of the bundled cidercade object). */
declare function cidercadeMaybeUpdate_(options?: {
  force?: boolean;
}): { updated: boolean; version: string; tag?: string };
const VERIFICATION_QUESTION = "Verification SMS";
const VERIFICATION_FORM_ID = "VERIFICATION_FORM_ID";
const VERIFICATION_SHORTCUT_URL = "VERIFICATION_SHORTCUT_URL";
const DAILY_RUN_HOUR_PROPERTY = "DAILY_RUN_HOUR";
const PROVISION_PREVIOUS_HOUR = "PROVISION_PREVIOUS_HOUR";
const SETUP_DIALOG_HTML = renderSetupDialog();
const DISCORD_WEBHOOK_PATTERN =
  /^https:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\//;
const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

function readDailyRunHour() {
  return parseRunHour(
    PropertiesService.getScriptProperties().getProperty(
      DAILY_RUN_HOUR_PROPERTY,
    ),
    DEFAULT_DAILY_RUN_HOUR,
  );
}

function readWebhookAppearance(): WebhookAppearanceForm {
  const properties = PropertiesService.getScriptProperties();
  return {
    name: properties.getProperty("DISCORD_WEBHOOK_NAME") ?? "",
    iconUrl: properties.getProperty("DISCORD_WEBHOOK_ICON_URL") ?? "",
  };
}

function clearWebhookAppearance(
  properties: GoogleAppsScript.Properties.Properties,
) {
  properties.deleteProperty("DISCORD_WEBHOOK_NAME");
  properties.deleteProperty("DISCORD_WEBHOOK_ICON_URL");
}

// The editor's Run button defaults to the first function, so keep this first.
export async function runDailyTasks() {
  try {
    cidercadeMaybeUpdate_();
  } catch (error) {
    console.error(`Update check failed: ${formatError(error)}`);
  }
  if (!(await daily.runDailyTasks())) {
    throw new Error("Some daily tasks failed");
  }
}

function triggersFor(handler: string) {
  return ScriptApp.getProjectTriggers().filter(
    (trigger) => trigger.getHandlerFunction() === handler,
  );
}

/** Clock triggers cannot be edited; only recreate when the hour changes. */
function scheduleDailyRun(hour: number, previousHour: number) {
  const existing = triggersFor(RUN_DAILY_TASKS);
  if (existing.length === 1 && previousHour === hour) {
    return;
  }

  for (const trigger of existing) {
    ScriptApp.deleteTrigger(trigger);
  }

  ScriptApp.newTrigger(RUN_DAILY_TASKS)
    .timeBased()
    .everyDays(1)
    .atHour(hour)
    .create();
}

type PublishableForm = GoogleAppsScript.Forms.Form & {
  supportsAdvancedResponderPermissions(): boolean;
  setPublished(enabled: boolean): GoogleAppsScript.Forms.Form;
};

function clearVerificationFormCache(
  properties: GoogleAppsScript.Properties.Properties,
) {
  properties.deleteProperty(VERIFICATION_FORM_ID);
  properties.deleteProperty(VERIFICATION_SHORTCUT_URL);
}

/** Form owned by this Doc-bound script; not the container itself. */
function getOrCreateVerificationForm() {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty(VERIFICATION_FORM_ID);
  if (existingId) {
    try {
      return {
        form: FormApp.openById(existingId) as PublishableForm,
        created: false,
      };
    } catch (error) {
      // Trash/delete leaves a stale ID; clear it and make a new form below.
      console.error(
        `Could not open verification form ${existingId}: ${formatError(error)}`,
      );
      clearVerificationFormCache(properties);
    }
  }

  const form = FormApp.create(TITLE) as PublishableForm;
  properties.setProperty(VERIFICATION_FORM_ID, form.getId());
  return { form, created: true };
}

/** Keep the form-submit trigger when it already points at this form. */
function scheduleFormSubmit(form: GoogleAppsScript.Forms.Form) {
  const formId = form.getId();
  const existing = triggersFor(ON_FORM_SUBMIT);
  if (existing.length === 1 && existing[0]?.getTriggerSourceId() === formId) {
    return;
  }

  for (const trigger of existing) {
    ScriptApp.deleteTrigger(trigger);
  }

  ScriptApp.newTrigger(ON_FORM_SUBMIT).forForm(form).onFormSubmit().create();
}

function entryFieldFromShortcutUrl(shortcutUrl: string) {
  return shortcutUrl.match(/[?&](entry\.\d+)=/)?.[1];
}

function findVerificationItem(form: GoogleAppsScript.Forms.Form) {
  return (
    form
      .getItems(FormApp.ItemType.TEXT)
      .find((entry) => entry.getTitle() === VERIFICATION_QUESTION) ??
    form.getItems(FormApp.ItemType.TEXT)[0] ??
    form.getItems(FormApp.ItemType.PARAGRAPH_TEXT)[0]
  );
}

function buildShortcutUrl(
  form: GoogleAppsScript.Forms.Form,
  item: GoogleAppsScript.Forms.Item,
) {
  // item.getId() is NOT the entry.XXXX used in formResponse URLs. A prefilled
  // URL is the reliable way to get the real field name Shortcuts need.
  const itemResponse =
    item.getType() === FormApp.ItemType.PARAGRAPH_TEXT
      ? item.asParagraphTextItem().createResponse("x")
      : item.asTextItem().createResponse("x");
  const prefilledUrl = form
    .createResponse()
    .withItemResponse(itemResponse)
    .toPrefilledUrl();
  const entryField = prefilledUrl.match(/[?&](entry\.\d+)=/)?.[1];
  if (!entryField) {
    throw new Error("Could not find the form entry field for the Shortcut URL");
  }
  // Keep entry= last so Shortcuts can append the URL-encoded SMS.
  const formResponseUrl = prefilledUrl
    .replace(/\/viewform.*/i, "/formResponse")
    .split("?")[0];
  return `${formResponseUrl}?usp=pp_url&submit=Submit&${entryField}=`;
}

/**
 * Reuse an existing form + cached Shortcut URL when the verification field's
 * entry.XXXX still matches. Otherwise rebuild/configure as needed.
 */
function prepareVerificationForm() {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty(VERIFICATION_FORM_ID);
  const cachedUrl = properties.getProperty(VERIFICATION_SHORTCUT_URL);
  const cachedEntry = cachedUrl
    ? entryFieldFromShortcutUrl(cachedUrl)
    : undefined;

  if (existingId && cachedUrl && cachedEntry) {
    try {
      const form = FormApp.openById(existingId) as PublishableForm;
      const item = findVerificationItem(form);
      if (item) {
        const shortcutUrl = buildShortcutUrl(form, item);
        if (entryFieldFromShortcutUrl(shortcutUrl) === cachedEntry) {
          return { form, created: false, shortcutUrl: cachedUrl };
        }
        // Question was recreated; keep the form but refresh the cached URL.
        properties.setProperty(VERIFICATION_SHORTCUT_URL, shortcutUrl);
        return { form, created: false, shortcutUrl };
      }
      // Field missing — fall through and reconfigure the form.
    } catch (error) {
      console.error(
        `Could not open verification form ${existingId}: ${formatError(error)}`,
      );
      clearVerificationFormCache(properties);
    }
  }

  const { form, created } = getOrCreateVerificationForm();
  form.setTitle(TITLE);
  form.setDescription(
    "Paste a Cidercade verification SMS here, or point your phone automation at the Shortcut URL from Cidercade Completer → Set up.",
  );

  const existing = findVerificationItem(form);

  const helpText =
    "This field acts as an endpoint for token refresh. Your mobile device should automatically send the SMS to this form, so you do not need to fill this out unless you are manually authenticating.";

  const item = (
    existing
      ? existing.setTitle(VERIFICATION_QUESTION).setHelpText(helpText)
      : form
          .addTextItem()
          .setTitle(VERIFICATION_QUESTION)
          .setHelpText(helpText)
          .setRequired(true)
  ) as GoogleAppsScript.Forms.Item;

  if (form.supportsAdvancedResponderPermissions()) {
    form.setPublished(true);
  }
  form.setAcceptingResponses(true);
  try {
    form.setRequireLogin(false);
  } catch {
    // Consumer accounts often disallow this call; anonymous access still works.
  }
  try {
    form.setCollectEmail(false);
  } catch {
    // Older forms may not allow changing this after responses exist.
  }

  const shortcutUrl = buildShortcutUrl(form, item);
  properties.setProperty(VERIFICATION_SHORTCUT_URL, shortcutUrl);
  return { form, created, shortcutUrl };
}

function runInBackground(task: Promise<unknown>, description: string) {
  task.catch((error) => {
    console.error(`${description} failed: ${formatError(error)}`);
  });
}

export function setUp() {
  const update = cidercadeMaybeUpdate_();
  if (update.updated) {
    DocumentApp.getUi().alert(
      `Cidercade Completer was updated to ${update.tag ?? update.version}. Open Set up again to use the new version.`,
    );
    return;
  }

  const properties = PropertiesService.getScriptProperties();
  const initialForm: SetupDialogInitial = {
    phone: properties.getProperty("PHONE_NUMBER") ?? "",
    webhookUrl: properties.getProperty("DISCORD_WEBHOOK_URL") ?? "",
    runHour: readDailyRunHour(),
    timeZone: Session.getScriptTimeZone(),
  };
  // Escaping "<" keeps the JSON from closing its script tag.
  const json = JSON.stringify(initialForm).replaceAll("<", "\\u003c");
  const html = HtmlService.createHtmlOutput(
    `<script type="application/json" id="${INITIAL_FORM_ID}">${json}</script>${SETUP_DIALOG_HTML}`,
  )
    .setWidth(460)
    .setHeight(460);
  DocumentApp.getUi().showModalDialog(html, `${TITLE} setup`);
}

/** Fast path: validate and persist settings only. */
export function saveSetup(form: SetupForm): SetupResult {
  const phone = formatPhoneNumber(form.phone);
  const webhookUrl = form.webhookUrl.trim();
  const runHour = parseRunHour(form.runHour, Number.NaN);
  const errors: SetupErrors = {};
  if (!phone) {
    errors.phone =
      "Enter a 10 digit number, or + and the country code outside the US.";
  }
  if (webhookUrl && !DISCORD_WEBHOOK_PATTERN.test(webhookUrl)) {
    errors.webhookUrl =
      "Discord webhook URLs start with https://discord.com/api/webhooks/.";
  }
  if (!Number.isInteger(runHour)) {
    errors.runHour = "Pick an hour between 12:00 AM and 11:00 PM.";
  }
  if (!phone || errors.webhookUrl || errors.runHour) {
    return { status: "invalid", errors };
  }

  const properties = PropertiesService.getScriptProperties();
  const previousPhone = properties.getProperty("PHONE_NUMBER");
  const previousHour = readDailyRunHour();
  properties.setProperty("PHONE_NUMBER", phone);
  properties.setProperty(DAILY_RUN_HOUR_PROPERTY, String(runHour));
  // Remember the old hour so background provision can decide whether to
  // recreate the clock trigger after this property was overwritten.
  properties.setProperty(PROVISION_PREVIOUS_HOUR, String(previousHour));
  if (webhookUrl) {
    properties.setProperty("DISCORD_WEBHOOK_URL", webhookUrl);
  } else {
    properties.deleteProperty("DISCORD_WEBHOOK_URL");
    clearWebhookAppearance(properties);
  }
  // A token only works for the account it was issued to.
  if (phone !== previousPhone) {
    properties.deleteProperty("TOKEN");
  }

  const schedule = `Daily tasks will run every day around ${formatRunHour(runHour)} (${Session.getScriptTimeZone()}).`;
  const message = properties.getProperty("TOKEN")
    ? `Saved. ${schedule}`
    : `Saved. Create your phone automation with the Shortcut URL below, then run ${TITLE} → Run daily tasks to send a verification code and test it. ${schedule}`;

  return {
    status: "saved",
    message,
    shortcutUrl: properties.getProperty(VERIFICATION_SHORTCUT_URL) ?? "",
    configureWebhook: Boolean(webhookUrl),
    webhookAppearance: readWebhookAppearance(),
    needsProvision: true,
  };
}

/**
 * Creates/reuses the verification form and installs triggers.
 * Called from the dialog after save so the first page can return quickly.
 */
export function provisionSetup(): ProvisionResult {
  try {
    const properties = PropertiesService.getScriptProperties();
    const runHour = readDailyRunHour();
    const previousHour = parseRunHour(
      properties.getProperty(PROVISION_PREVIOUS_HOUR),
      runHour,
    );

    const { form, created, shortcutUrl } = prepareVerificationForm();
    scheduleDailyRun(runHour, previousHour);
    scheduleFormSubmit(form);
    properties.deleteProperty(PROVISION_PREVIOUS_HOUR);

    return {
      status: "ready",
      shortcutUrl,
      recreateNote: created
        ? " A new verification form was created, so update your phone automation with the Shortcut URL below."
        : "",
    };
  } catch (error) {
    return { status: "error", message: formatError(error) };
  }
}

/** Called by the setup dialog after a webhook URL is saved. */
export function saveWebhookAppearance(
  form: WebhookAppearanceForm,
): WebhookAppearanceResult {
  const name = form.name.trim();
  const iconUrl = form.iconUrl.trim();
  const errors: WebhookAppearanceErrors = {};
  if (iconUrl && !HTTP_URL_PATTERN.test(iconUrl)) {
    errors.iconUrl = "Icon URL must start with http:// or https://.";
  }
  if (errors.iconUrl) {
    return { status: "invalid", errors };
  }

  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty("DISCORD_WEBHOOK_URL")) {
    clearWebhookAppearance(properties);
    return { status: "saved" };
  }

  if (name) {
    properties.setProperty("DISCORD_WEBHOOK_NAME", name);
  } else {
    properties.deleteProperty("DISCORD_WEBHOOK_NAME");
  }
  if (iconUrl) {
    properties.setProperty("DISCORD_WEBHOOK_ICON_URL", iconUrl);
  } else {
    properties.deleteProperty("DISCORD_WEBHOOK_ICON_URL");
  }
  return { status: "saved" };
}

async function authenticate(code: string) {
  const properties = PropertiesService.getScriptProperties();
  const phone = properties.getProperty("PHONE_NUMBER");
  if (!phone) {
    throw new Error(`PHONE_NUMBER is not set. Run ${TITLE} → Set up first.`);
  }

  properties.setProperty("TOKEN", await exchangeVerificationCode(phone, code));
  await runDailyTasks();
}

/** Installable trigger: verification SMS posted to the owned form. */
export function onFormSubmit(
  event?: GoogleAppsScript.Events.FormsOnFormSubmit,
) {
  if (!event) {
    throw new Error(
      `onFormSubmit only handles form submissions. Run ${RUN_DAILY_TASKS} instead.`,
    );
  }

  const response = event.response;
  const message = response
    .getItemResponses()
    .map((item) => String(item.getResponse()))
    .join(" ");

  try {
    const formId =
      PropertiesService.getScriptProperties().getProperty(VERIFICATION_FORM_ID);
    if (formId) {
      FormApp.openById(formId).deleteResponse(response.getId());
    }
  } catch (error) {
    console.error(`Could not delete form response: ${formatError(error)}`);
  }

  runInBackground(
    authenticate(extractVerificationCode(message)),
    "Authentication",
  );
}

export function onOpen() {
  DocumentApp.getUi()
    .createMenu(TITLE)
    .addItem("Set up", SET_UP)
    .addItem("Run daily tasks", RUN_DAILY_TASKS)
    .addItem("Check for updates", CHECK_FOR_UPDATES)
    .addToUi();
}
