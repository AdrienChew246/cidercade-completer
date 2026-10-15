/// <reference types="google-apps-script" />

import * as daily from "@/daily";
import {
  exchangeVerificationCode,
  extractVerificationCode,
  formatPhoneNumber,
  sendVerificationCode,
} from "@/hang";
import { formatError } from "@/tasks";
import { renderEndpointPage } from "./endpoint-page";

// Apps Script refers to these by name, so they must match the exports below.
const RUN_DAILY_TASKS = "runDailyTasks";
const SET_UP = "setUp";
const PROMPT_VERIFICATION_MESSAGE = "promptVerificationMessage";

const TITLE = "Cidercade";
const DAILY_RUN_HOUR = 0;
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

/** Resolves to `undefined` when the dialog is cancelled. */
function ask(prompt: string) {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(TITLE, prompt, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return undefined;
  return response.getResponseText().trim();
}

function askPhoneNumber(current: string | null) {
  const countryCodeHint = "Start with + and the country code outside the US.";
  let prompt = current
    ? `Phone number for your Cidercade account (leave blank to keep ${current}). ${countryCodeHint}`
    : `Phone number for your Cidercade account. ${countryCodeHint}`;

  while (true) {
    const answer = ask(prompt);
    if (answer === undefined) return undefined;
    if (!answer && current) return current;

    const phone = formatPhoneNumber(answer);
    if (phone) return phone;
    prompt = `"${answer}" is not a valid phone number. ${countryCodeHint} Try again:`;
  }
}

/** Resolves to an empty string when Discord notifications are skipped. */
function askDiscordWebhookUrl(current: string | null) {
  let prompt = current
    ? "Discord webhook URL for run summaries (leave blank to keep the current one):"
    : "Discord webhook URL for run summaries (optional, leave blank to skip):";

  while (true) {
    const answer = ask(prompt);
    if (answer === undefined) return undefined;
    if (!answer) return current ?? "";

    if (DISCORD_WEBHOOK_PATTERN.test(answer)) return answer;
    prompt =
      "That is not a Discord webhook URL. It should start with https://discord.com/api/webhooks/. Try again:";
  }
}

export async function setUp() {
  const properties = PropertiesService.getScriptProperties();
  const previousPhone = properties.getProperty("PHONE_NUMBER");

  const phone = askPhoneNumber(previousPhone);
  if (!phone) return;
  const webhookUrl = askDiscordWebhookUrl(
    properties.getProperty("DISCORD_WEBHOOK_URL"),
  );
  if (webhookUrl === undefined) return;

  properties.setProperty("PHONE_NUMBER", phone);
  if (webhookUrl) {
    properties.setProperty("DISCORD_WEBHOOK_URL", webhookUrl);
  }
  // A token only works for the account it was issued to.
  if (phone !== previousPhone) {
    properties.deleteProperty("TOKEN");
  }
  scheduleDailyRun();

  if (properties.getProperty("TOKEN")) {
    SpreadsheetApp.getActive().toast(
      `Daily tasks will run every day around ${DAILY_RUN_HOUR}:00.`,
      TITLE,
    );
    return;
  }

  await sendVerificationCode(phone);
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    TITLE,
    `A verification code was texted to ${phone}. Your phone automation will forward it, or click ${TITLE} → Authenticate and paste the text. Daily tasks will then run every day around ${DAILY_RUN_HOUR}:00.`,
    ui.ButtonSet.OK,
  );
}

async function authenticate(code: string) {
  const properties = PropertiesService.getScriptProperties();
  const phone = properties.getProperty("PHONE_NUMBER");
  if (!phone) {
    throw new Error("PHONE_NUMBER is not set. Run Cidercade → Set up first.");
  }

  properties.setProperty("TOKEN", await exchangeVerificationCode(phone, code));
  await runDailyTasks();
}

export async function promptVerificationMessage() {
  const message = ask(
    "Paste the Cidercade verification SMS you were texted, or its six digit code:",
  );
  if (message === undefined) return;

  await authenticate(extractVerificationCode(message));
}

export function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(TITLE)
    .addItem("Set up", SET_UP)
    .addItem("Run daily tasks", RUN_DAILY_TASKS)
    .addItem("Authenticate", PROMPT_VERIFICATION_MESSAGE)
    .addToUi();

  if (!PropertiesService.getScriptProperties().getProperty("PHONE_NUMBER")) {
    SpreadsheetApp.getActive().toast(
      "Click Cidercade → Set up to get started.",
      TITLE,
      -1,
    );
  }
}

export function doGet() {
  return HtmlService.createHtmlOutput(
    renderEndpointPage(ScriptApp.getService().getUrl()),
  )
    .setTitle(TITLE)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Web app endpoint for phone automations that forward the verification SMS. */
export function doPost(event?: GoogleAppsScript.Events.DoPost) {
  if (!event) {
    throw new Error(
      `doPost only handles web app requests. Run ${RUN_DAILY_TASKS} instead.`,
    );
  }

  const message = event.parameter.message ?? event.postData?.contents ?? "";
  const code = extractVerificationCode(message);

  // A web app must return its response synchronously.
  authenticate(code).catch((error) => {
    console.error(`Authentication failed: ${formatError(error)}`);
  });

  return ContentService.createTextOutput(
    "Verification code received. Running daily tasks.",
  );
}
