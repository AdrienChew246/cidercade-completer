export const ROOT_ID = "root";
export const INITIAL_FORM_ID = "initial-form";

export type SetupForm = {
  phone: string;
  webhookUrl: string;
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

export type SetupResult =
  | {
      status: "saved";
      message: string;
      /** Ends with `&entry.<id>=` so Shortcuts can append the URL-encoded SMS. */
      shortcutUrl: string;
    }
  | { status: "invalid"; errors: SetupErrors };
