import { getEnv } from "#runtime";
import { sendVerificationCode } from "./auth";
import { candyBlastTask } from "./candy-blast";
import { postInvalidTokenNotice, postRunSummary } from "./discord";
import { lootBoxTask } from "./loot-box";
import {
  formatError,
  isTaskSuccessful,
  runTask,
  type Task,
  type TaskOutcome,
} from "./task";
import { wotdTask } from "./wotd";

const TASKS: Task<unknown>[] = [wotdTask, candyBlastTask, lootBoxTask];

async function requestVerificationCode(phone: string) {
  console.log("Sending OTP to phone.");
  try {
    await postInvalidTokenNotice();
  } catch (error) {
    console.error(`Discord notification failed: ${formatError(error)}`);
  }
  await sendVerificationCode(phone);
}

function isNotAuthorized(outcome: TaskOutcome) {
  return (
    typeof outcome.status === "object" &&
    outcome.status.error.includes("Not Authorized")
  );
}

/**
 * Resolves to whether every task succeeded. Stopping early to text a new
 * verification code counts as success.
 */
export async function runDailyTasks() {
  const phone = getEnv("PHONE_NUMBER");

  if (!getEnv("TOKEN")) {
    if (phone) {
      await requestVerificationCode(phone);
      return true;
    }
    throw new Error("TOKEN is not set");
  }

  const outcomes: TaskOutcome[] = [];
  for (const task of TASKS) {
    const outcome = await runTask(task);
    if (phone && isNotAuthorized(outcome)) {
      await requestVerificationCode(phone);
      return true;
    }
    outcomes.push(outcome);
  }

  try {
    await postRunSummary(outcomes);
  } catch (error) {
    console.error(`Discord notification failed: ${formatError(error)}`);
  }

  return outcomes.every(isTaskSuccessful);
}
