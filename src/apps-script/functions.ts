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
  INITIAL_FORM_ID,
  type SetupErrors,
  type SetupForm,
  type SetupResult,
} from "./setup-dialog/shared";

// Apps Script refers to these by name, so they must match the exports below.
const RUN_DAILY_TASKS = "runDailyTasks";
const SET_UP = "setUp";
const ON_FORM_SUBMIT = "onFormSubmit";

const TITLE = "Cidercade Completer";
const VERIFICATION_QUESTION = "Verification SMS";
const VERIFICATION_FORM_ID = "VERIFICATION_FORM_ID";
const DAILY_RUN_HOUR = 0;
const SETUP_DIALOG_HTML = renderSetupDialog();
const DISCORD_WEBHOOK_PATTERN =
  /^https:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\//;

// The editor's Run button defaults to the first function, so keep this first.
export async function runDailyTasks() {
  if (!(await daily.runDailyTasks())) {
    throw new Error("Some daily tasks failed");
  }
}

function scheduleDailyRun() {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === RUN_DAILY_TASKS) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger(RUN_DAILY_TASKS)
    .timeBased()
    .everyDays(1)
    .atHour(DAILY_RUN_HOUR)
    .create();
}

type PublishableForm = GoogleAppsScript.Forms.Form & {
  supportsAdvancedResponderPermissions(): boolean;
  setPublished(enabled: boolean): GoogleAppsScript.Forms.Form;
};

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
      properties.deleteProperty(VERIFICATION_FORM_ID);
    }
  }

  const form = FormApp.create(TITLE) as PublishableForm;
  properties.setProperty(VERIFICATION_FORM_ID, form.getId());
  return { form, created: true };
}

function scheduleFormSubmit(form: GoogleAppsScript.Forms.Form) {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === ON_FORM_SUBMIT) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger(ON_FORM_SUBMIT).forForm(form).onFormSubmit().create();
}

/** Ensure the owned form can receive verification codes from a Shortcut. */
function prepareVerificationForm() {
  const { form, created } = getOrCreateVerificationForm();
  form.setTitle(TITLE);
  form.setDescription(
    "Paste a Cidercade verification SMS here, or point your phone automation at the Shortcut URL from Cidercade Completer → Set up.",
  );

  const existing =
    form
      .getItems(FormApp.ItemType.TEXT)
      .find((entry) => entry.getTitle() === VERIFICATION_QUESTION) ??
    form.getItems(FormApp.ItemType.TEXT)[0] ??
    form.getItems(FormApp.ItemType.PARAGRAPH_TEXT)[0];

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
  return {
    form,
    created,
    shortcutUrl: `${formResponseUrl}?usp=pp_url&submit=Submit&${entryField}=`,
  };
}

function runInBackground(task: Promise<unknown>, description: string) {
  task.catch((error) => {
    console.error(`${description} failed: ${formatError(error)}`);
  });
}

export function setUp() {
  const properties = PropertiesService.getScriptProperties();
  const initialForm: SetupForm = {
    phone: properties.getProperty("PHONE_NUMBER") ?? "",
    webhookUrl: properties.getProperty("DISCORD_WEBHOOK_URL") ?? "",
  };
  // Escaping "<" keeps the JSON from closing its script tag.
  const json = JSON.stringify(initialForm).replaceAll("<", "\\u003c");
  const html = HtmlService.createHtmlOutput(
    `<script type="application/json" id="${INITIAL_FORM_ID}">${json}</script>${SETUP_DIALOG_HTML}`,
  )
    .setWidth(460)
    .setHeight(360);
  DocumentApp.getUi().showModalDialog(html, `${TITLE} setup`);
}

/** Called by the setup dialog. */
export function saveSetup(form: SetupForm): SetupResult {
  const phone = formatPhoneNumber(form.phone);
  const webhookUrl = form.webhookUrl.trim();
  const errors: SetupErrors = {};
  if (!phone) {
    errors.phone =
      "Enter a 10 digit number, or + and the country code outside the US.";
  }
  if (webhookUrl && !DISCORD_WEBHOOK_PATTERN.test(webhookUrl)) {
    errors.webhookUrl =
      "Discord webhook URLs start with https://discord.com/api/webhooks/.";
  }
  if (!phone || errors.webhookUrl) {
    return { status: "invalid", errors };
  }

  const properties = PropertiesService.getScriptProperties();
  const previousPhone = properties.getProperty("PHONE_NUMBER");
  properties.setProperty("PHONE_NUMBER", phone);
  if (webhookUrl) {
    properties.setProperty("DISCORD_WEBHOOK_URL", webhookUrl);
  } else {
    properties.deleteProperty("DISCORD_WEBHOOK_URL");
  }
  // A token only works for the account it was issued to.
  if (phone !== previousPhone) {
    properties.deleteProperty("TOKEN");
  }

  const {
    form: verificationForm,
    created,
    shortcutUrl,
  } = prepareVerificationForm();
  scheduleDailyRun();
  scheduleFormSubmit(verificationForm);

  const schedule = `Daily tasks will run every day around ${DAILY_RUN_HOUR}:00.`;
  const recreateNote = created
    ? " A new verification form was created, so update your phone automation with the Shortcut URL below."
    : "";
  if (properties.getProperty("TOKEN")) {
    return {
      status: "saved",
      message: `Saved. ${schedule}${recreateNote}`,
      shortcutUrl,
    };
  }

  return {
    status: "saved",
    message: `Saved. Create your phone automation with the Shortcut URL below, then run ${TITLE} → Run daily tasks to send a verification code and test it. ${schedule}${recreateNote}`,
    shortcutUrl,
  };
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
    .addToUi();
}
