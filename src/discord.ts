import { isTaskSuccessful, type TaskOutcome } from "./task";

const DISCORD_USERNAME = "Cidercade";
const DISCORD_AVATAR_URL =
  "https://play-lh.googleusercontent.com/R_OXYCUKoLu2iNUeIrHYxPP6aajlXR5K1icPAWt_cunCJXcPHZzl6TXO2Uu6UEQrQ5jFUkC1lDaCicvEmu64=w240-h480";

const COLOR_SUCCESS = 0x57f287;
const COLOR_FAILURE = 0xed4245;
const COLOR_PARTIAL = 0xfee75c;

function formatDuration(durationMs: number) {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatStatus(outcome: TaskOutcome) {
  if (outcome.status === "success") return "✅";
  if (outcome.status === "already-completed") return "♻️";
  return `❌ ${outcome.status.error}`;
}

function buildDescription(outcomes: TaskOutcome[], successCount: number) {
  const status =
    successCount === outcomes.length
      ? "All tasks completed"
      : successCount > 0
        ? "Completed with errors"
        : "All tasks failed";

  const summaries = outcomes
    .map((outcome) => outcome.summary)
    .filter((summary) => summary);

  return [status, ...summaries].join("\n\n");
}

function buildSummaryEmbed(outcomes: TaskOutcome[]) {
  const successCount = outcomes.filter(isTaskSuccessful).length;

  return {
    title: "Cidercade Daily Run",
    description: buildDescription(outcomes, successCount),
    color:
      successCount === outcomes.length
        ? COLOR_SUCCESS
        : successCount > 0
          ? COLOR_PARTIAL
          : COLOR_FAILURE,
    fields: outcomes
      .filter((outcome) => outcome.showResult)
      .map((outcome) => ({
        name: outcome.name,
        value: `${formatStatus(outcome)} (${formatDuration(outcome.durationMs)})`,
        inline: true,
      })),
  };
}

export async function postRunSummary(outcomes: TaskOutcome[]) {
  await postEmbed(buildSummaryEmbed(outcomes));
}

export async function postInvalidTokenNotice() {
  await postEmbed({
    title: "Token Invalid",
    description:
      "Sending OTP to phone. Run the **Authenticate Cidercade** workflow with the verification SMS.",
    color: COLOR_FAILURE,
  });
}

async function postEmbed(embed: object) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      "DISCORD_WEBHOOK_URL is not set; skipping Discord notification",
    );
    return;
  }

  const payload = {
    username: DISCORD_USERNAME,
    avatar_url: DISCORD_AVATAR_URL,
    embeds: [embed],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook failed (${res.status}): ${body}`);
  }
}
