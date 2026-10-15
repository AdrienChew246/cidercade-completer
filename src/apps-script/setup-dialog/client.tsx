/** @jsxImportSource preact */
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  formatPhoneNumberInput,
  INITIAL_FORM_ID,
  ROOT_ID,
  type SetupErrors,
  type SetupForm,
  type SetupResult,
} from "./shared";

type ScriptRunner = {
  withSuccessHandler(handler: (result: SetupResult) => void): ScriptRunner;
  withFailureHandler(handler: (error: Error) => void): ScriptRunner;
  saveSetup(form: SetupForm): void;
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
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .saveSetup(form);
  });
}

type TextFieldProps = {
  label: string;
  hint: string;
  error?: string;
  inputMode: "tel" | "url";
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

function SetupDialog({ initialForm }: { initialForm: SetupForm }) {
  const [form, setForm] = useState({
    ...initialForm,
    phone: formatPhoneNumberInput(initialForm.phone),
  });
  const [errors, setErrors] = useState<SetupErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [saved, setSaved] =
    useState<Extract<SetupResult, { status: "saved" }>>();

  useEffect(() => {
    fitDialogHeight();
  }, [saved, failure, errors, saving]);

  function updateField(field: keyof SetupForm, value: string) {
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
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div class="stack">
        <p class="message">{saved.message}</p>
        <CopyField label="Shortcut URL" value={saved.shortcutUrl} />
        <ol class="steps">
          <li>URL Encode the Shortcut Input (the SMS).</li>
          <li>
            Get Contents of URL: Shortcut URL + the Encoded text (the URL
            already ends with <span class="mono">entry…=</span>).
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
      {failure && <p class="failure">{failure}</p>}
      <button class="button" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save and schedule"}
      </button>
    </form>
  );
}

function readInitialForm(): SetupForm {
  const json = document.getElementById(INITIAL_FORM_ID)?.textContent;
  if (!json) {
    throw new Error(`#${INITIAL_FORM_ID} is missing`);
  }
  return JSON.parse(json);
}

const root = document.getElementById(ROOT_ID);
if (!root) {
  throw new Error(`#${ROOT_ID} is missing`);
}
render(<SetupDialog initialForm={readInitialForm()} />, root);
