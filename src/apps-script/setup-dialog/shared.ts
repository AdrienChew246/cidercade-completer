import {
  DEFAULT_DISCORD_WEBHOOK_ICON_URL,
  DEFAULT_DISCORD_WEBHOOK_NAME,
} from "../../discord-defaults";

export const ROOT_ID = "root";
export const INITIAL_FORM_ID = "initial-form";
export const DEFAULT_DAILY_RUN_HOUR = 0;

export { DEFAULT_DISCORD_WEBHOOK_ICON_URL, DEFAULT_DISCORD_WEBHOOK_NAME };

export type SetupForm = {
  phone: string;
  webhookUrl: string;
  /** Hour of day 0–23 in the Apps Script project timezone. */
  runHour: number;
};

/** Extra fields for the dialog bootstrap JSON (not sent back on save). */
export type SetupDialogInitial = SetupForm & {
  timeZone: string;
};

/** Labels for a 0–23 hour select (e.g. "12:00 AM", "1:00 PM"). */
export function runHourOptions() {
  return Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: formatRunHour(hour),
  }));
}

export function formatRunHour(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${period}`;
}

export function parseRunHour(value: unknown, fallback = DEFAULT_DAILY_RUN_HOUR) {
  const hour =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return fallback;
  }
  return hour;
}

export type WebhookAppearanceForm = {
  name: string;
  iconUrl: string;
};

/**
 * Progressive formatter for the setup dialog.
 * US numbers become "(512) 555-0123"; anything starting with + or longer than
 * 10 digits becomes "+<digits>".
 */
export function formatPhoneNumberInput(input: string) {
  const trimmed = input.trimStart();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "").slice(0, 15);
    return digits ? `+${digits}` : "+";
  }

  let digits = input.replace(/\D/g, "");
  if (digits.length > 10) {
    if (digits.startsWith("1") && digits.length === 11) {
      digits = digits.slice(1);
    } else {
      return `+${digits.slice(0, 15)}`;
    }
  }

  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export type SetupErrors = Partial<Record<keyof SetupForm, string>>;
export type WebhookAppearanceErrors = Partial<
  Record<keyof WebhookAppearanceForm, string>
>;

export type SetupResult =
  | {
      status: "saved";
      message: string;
      /**
       * Cached Shortcut URL when available. May be empty until
       * `provisionSetup` finishes on first-time setup.
       */
      shortcutUrl: string;
      /** When true, the dialog should offer webhook name/icon settings next. */
      configureWebhook: boolean;
      webhookAppearance: WebhookAppearanceForm;
      /** Client should call `provisionSetup` in the background. */
      needsProvision: boolean;
    }
  | { status: "invalid"; errors: SetupErrors };

export type ProvisionResult =
  | {
      status: "ready";
      shortcutUrl: string;
      /** Extra note when a new verification form was created. */
      recreateNote: string;
    }
  | { status: "error"; message: string };

export type WebhookAppearanceResult =
  | { status: "saved" }
  | { status: "invalid"; errors: WebhookAppearanceErrors };
