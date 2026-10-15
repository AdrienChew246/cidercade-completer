/// <reference types="google-apps-script" />
import { exchangeVerificationCode, extractVerificationCode } from "../auth";
import * as daily from "../daily";
import { formatError } from "../task";

// Apps Script refers to these by name, so they must match the exports below.
const RUN_DAILY_TASKS = "runDailyTasks";
const PROMPT_VERIFICATION_MESSAGE = "promptVerificationMessage";
const SCHEDULE_DAILY_RUN = "scheduleDailyRun";

const DAILY_RUN_HOUR = 0;

export function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Cidercade")
    .addItem("Run daily tasks", RUN_DAILY_TASKS)
    .addItem("Enter verification SMS", PROMPT_VERIFICATION_MESSAGE)
    .addItem("Schedule daily run", SCHEDULE_DAILY_RUN)
    .addToUi();
}

export async function runDailyTasks() {
  if (!(await daily.runDailyTasks())) {
    throw new Error("Some daily tasks failed");
  }
}

export function scheduleDailyRun() {
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

  SpreadsheetApp.getActive()?.toast(
    `Daily tasks will run every day around ${DAILY_RUN_HOUR}:00.`,
    "Cidercade",
  );
}

async function authenticate(code: string) {
  const properties = PropertiesService.getScriptProperties();
  const phone = properties.getProperty("PHONE_NUMBER");
  if (!phone) {
    throw new Error("PHONE_NUMBER script property is not set");
  }

  properties.setProperty("TOKEN", await exchangeVerificationCode(phone, code));
  await runDailyTasks();
}

export async function promptVerificationMessage() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Cidercade verification",
    "Paste the verification SMS or its six digit code:",
    ui.ButtonSet.OK_CANCEL,
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  await authenticate(extractVerificationCode(response.getResponseText()));
}

/** Web app endpoint for phone automations that forward the verification SMS. */
export function doPost(event: GoogleAppsScript.Events.DoPost) {
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
