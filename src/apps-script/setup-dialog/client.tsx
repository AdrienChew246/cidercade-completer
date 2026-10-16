/** @jsxImportSource preact */
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  DEFAULT_DAILY_RUN_HOUR,
  DEFAULT_DISCORD_WEBHOOK_ICON_URL,
  DEFAULT_DISCORD_WEBHOOK_NAME,
  formatPhoneNumberInput,
  INITIAL_FORM_ID,
  parseRunHour,
  ROOT_ID,
  runHourOptions,
  type SetupDialogInitial,
  type SetupErrors,
  type SetupForm,
  type SetupResult,
  type WebhookAppearanceErrors,
  type WebhookAppearanceForm,
  type WebhookAppearanceResult,
} from "./shared";

const RUN_HOUR_OPTIONS = runHourOptions();

type ScriptRunner = {
  withSuccessHandler(
    handler: (result: SetupResult | WebhookAppearanceResult) => void,
  ): ScriptRunner;
  withFailureHandler(handler: (error: Error) => void): ScriptRunner;
  saveSetup(form: SetupForm): void;
  saveWebhookAppearance(form: WebhookAppearanceForm): void;
};

declare const google: {
  script: {
    run: ScriptRunner;
    host: {
      close(): void;
      setHeight(height: number): void;
    };
  };
};

function fitDialogHeight() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  // HtmlService chrome adds a little vertical padding around the iframe body.
  google.script.host.setHeight(
    Math.ceil(root.getBoundingClientRect().height) + 24,
  );
}

function saveSetup(form: SetupForm) {
  return new Promise<SetupResult>((resolve, reject) => {
    google.script.run
      .withSuccessHandler((result) => resolve(result as SetupResult))
      .withFailureHandler(reject)
      .saveSetup(form);
  });
}

function saveWebhookAppearance(form: WebhookAppearanceForm) {
  return new Promise<WebhookAppearanceResult>((resolve, reject) => {
    google.script.run
      .withSuccessHandler((result) =>
        resolve(result as WebhookAppearanceResult),
      )
      .withFailureHandler(reject)
      .saveWebhookAppearance(form);
  });
}

type TextFieldProps = {
  label: string;
  hint: string;
  error?: string;
  inputMode: "tel" | "url" | "text";
  autoComplete: "tel" | "off";
  value: string;
  placeholder: string;
  onInput(value: string): void;
};

function TextField({
  label,
  hint,
  error,
  inputMode,
  autoComplete,
  value,
  placeholder,
  onInput,
}: TextFieldProps) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input
        class={`input${error ? " is-error" : ""}`}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onInput={(event) => onInput(event.currentTarget.value)}
      />
      <span class={`field-hint${error ? " is-error" : ""}`}>
        {error ?? hint}
      </span>
    </label>
  );
}

type CopyFieldProps = {
  label: string;
  value: string;
};

function CopyField({ label, value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <div class="input-row">
        <input
          class="input input-mono"
          type="text"
          value={value}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          class="button button-secondary"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </label>
  );
}

function IconPreview({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  const previewUrl = url.trim() || DEFAULT_DISCORD_WEBHOOK_ICON_URL;

  useEffect(() => {
    setBroken(false);
  }, [previewUrl]);

  if (broken) {
    return <div class="icon-preview-fallback">?</div>;
  }

  return (
    <img
      class="icon-preview-image"
      src={previewUrl}
      alt="Webhook icon preview"
      onError={() => setBroken(true)}
    />
  );
}

type SavedSetup = Extract<SetupResult, { status: "saved" }>;

function DonePanel({ saved }: { saved: SavedSetup }) {
  return (
    <div class="stack">
      <p class="message">{saved.message}</p>
      <CopyField label="Shortcut URL" value={saved.shortcutUrl} />
      <ol class="steps">
        <li>URL Encode the Shortcut Input (the SMS).</li>
        <li>
          Get Contents of URL: Shortcut URL + the Encoded text (the URL already
          ends with <span class="mono">entry…=</span>).
        </li>
        <li>
          After the automation is set up, run Cidercade → Run daily tasks to
          test.
        </li>
      </ol>
      <button
        class="button"
        type="button"
        onClick={() => google.script.host.close()}
      >
        Close
      </button>
    </div>
  );
}

function WebhookAppearanceStep({
  initial,
  onDone,
}: {
  initial: WebhookAppearanceForm;
  onDone(): void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<WebhookAppearanceErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();

  useEffect(() => {
    fitDialogHeight();
  }, [errors, saving, failure, form.iconUrl]);

  function updateField(field: keyof WebhookAppearanceForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit() {
    setSaving(true);
    setFailure(undefined);
    try {
      const result = await saveWebhookAppearance(form);
      if (result.status === "invalid") {
        setErrors(result.errors);
      } else {
        onDone();
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      class="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <p class="message">
        How Discord shows your webhook message. Leave blank for the defaults.
      </p>
      <TextField
        label="Name"
        hint={`Default: ${DEFAULT_DISCORD_WEBHOOK_NAME}`}
        error={errors.name}
        inputMode="text"
        autoComplete="off"
        value={form.name}
        placeholder={DEFAULT_DISCORD_WEBHOOK_NAME}
        onInput={(value) => updateField("name", value)}
      />
      <div class="icon-url-row">
        <IconPreview url={form.iconUrl} />
        <div class="icon-url-field">
          <TextField
            label="Icon URL"
            hint="Leave blank for the default Cidercade icon."
            error={errors.iconUrl}
            inputMode="url"
            autoComplete="off"
            value={form.iconUrl}
            placeholder="https://…"
            onInput={(value) => updateField("iconUrl", value)}
          />
        </div>
      </div>
      {failure && <p class="failure">{failure}</p>}
      <div class="button-row">
        <button
          class="button button-secondary button-grow"
          type="button"
          disabled={saving}
          onClick={() => onDone()}
        >
          Skip
        </button>
        <button class="button button-grow" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save appearance"}
        </button>
      </div>
    </form>
  );
}

function SetupDialog({ initial }: { initial: SetupDialogInitial }) {
  const [form, setForm] = useState<SetupForm>({
    phone: formatPhoneNumberInput(initial.phone),
    webhookUrl: initial.webhookUrl,
    runHour: parseRunHour(initial.runHour, DEFAULT_DAILY_RUN_HOUR),
  });
  const [errors, setErrors] = useState<SetupErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [saved, setSaved] = useState<SavedSetup>();
  const [step, setStep] = useState<"setup" | "webhook" | "done">("setup");

  useEffect(() => {
    fitDialogHeight();
  }, [saved, failure, errors, saving, step]);

  function updateField(field: "phone" | "webhookUrl", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit() {
    setSaving(true);
    setFailure(undefined);
    try {
      const result = await saveSetup(form);
      if (result.status === "invalid") {
        setErrors(result.errors);
      } else {
        setSaved(result);
        setStep(result.configureWebhook ? "webhook" : "done");
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (saved && step === "webhook") {
    return (
      <WebhookAppearanceStep
        initial={saved.webhookAppearance}
        onDone={() => setStep("done")}
      />
    );
  }

  if (saved && step === "done") {
    return <DonePanel saved={saved} />;
  }

  return (
    <form
      class="stack"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <TextField
        label="Phone number"
        hint="The number on your Cidercade account. Start with + and the country code outside the US."
        error={errors.phone}
        inputMode="tel"
        autoComplete="tel"
        value={form.phone}
        placeholder="(512) 555-0123"
        onInput={(value) => updateField("phone", formatPhoneNumberInput(value))}
      />
      <TextField
        label="Discord webhook URL (optional)"
        hint="Posts a summary after each run. Leave blank to skip."
        error={errors.webhookUrl}
        inputMode="url"
        autoComplete="off"
        value={form.webhookUrl}
        placeholder="https://discord.com/api/webhooks/..."
        onInput={(value) => updateField("webhookUrl", value)}
      />
      <label class="field">
        <span class="field-label">Daily run time</span>
        <select
          class={`input${errors.runHour ? " is-error" : ""}`}
          value={form.runHour}
          onChange={(event) => {
            setForm((current) => ({
              ...current,
              runHour: Number(event.currentTarget.value),
            }));
            setErrors((current) => ({ ...current, runHour: undefined }));
          }}
        >
          {RUN_HOUR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span class={`field-hint${errors.runHour ? " is-error" : ""}`}>
          {errors.runHour ??
            `Around this hour each day (${initial.timeZone}). Google may run it a little later.`}
        </span>
      </label>
      {failure && <p class="failure">{failure}</p>}
      <button class="button" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save and schedule"}
      </button>
    </form>
  );
}

function readInitialForm(): SetupDialogInitial {
  const json = document.getElementById(INITIAL_FORM_ID)?.textContent;
  if (!json) {
    throw new Error(`#${INITIAL_FORM_ID} is missing`);
  }
  const parsed = JSON.parse(json) as Partial<SetupDialogInitial>;
  return {
    phone: parsed.phone ?? "",
    webhookUrl: parsed.webhookUrl ?? "",
    runHour: parseRunHour(parsed.runHour, DEFAULT_DAILY_RUN_HOUR),
    timeZone: parsed.timeZone ?? "America/Chicago",
  };
}

const root = document.getElementById(ROOT_ID);
if (!root) {
  throw new Error(`#${ROOT_ID} is missing`);
}
render(<SetupDialog initial={readInitialForm()} />, root);
