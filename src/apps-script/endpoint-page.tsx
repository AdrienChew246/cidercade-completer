/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";
import { renderToStaticMarkup } from "preact-render-to-string";

const EXAMPLE_BODY = JSON.stringify(
  { message: "Your Cidercade verification code is: 123456" },
  null,
  2,
);

function Field({
  label,
  children,
}: {
  label: string;
  children: ComponentChildren;
}) {
  return (
    <div class="grid grid-cols-[7rem_1fr] gap-2 py-2">
      <dt class="font-medium text-slate-500">{label}</dt>
      <dd class="break-all font-mono text-sm">{children}</dd>
    </div>
  );
}

/** Prints the escaped value of `name` when Apps Script evaluates the template. */
function TemplateValue({ name }: { name: string }) {
  return <span dangerouslySetInnerHTML={{ __html: `<?= ${name} ?>` }} />;
}

function EndpointPage() {
  return (
    <main class="mx-auto max-w-xl p-6 font-sans text-slate-800">
      <h1 class="text-2xl font-bold">Cidercade Completer</h1>
      <p class="mt-3">
        This address receives Cidercade verification codes so your daily tasks
        can keep running. There is nothing to do on this page.
      </p>

      <h2 class="mt-8 text-lg font-semibold">Phone automation</h2>
      <p class="mt-2">
        When the verification text arrives, have your phone automation send it
        here (iOS Shortcuts: <strong>Get Contents of URL</strong>, MacroDroid:{" "}
        <strong>HTTP Request</strong>):
      </p>
      <dl class="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 px-4">
        <Field label="URL">
          <TemplateValue name="url" />
        </Field>
        <Field label="Method">POST</Field>
        <Field label="Body">JSON</Field>
        <Field label="Field">message = the verification text</Field>
      </dl>

      <p class="mt-4">The request body should look like:</p>
      <pre class="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-sm">
        {EXAMPLE_BODY}
      </pre>

      <p class="mt-8 text-sm text-slate-500">
        Without an automation, paste the text into{" "}
        <strong>Cidercade → Authenticate</strong> in the spreadsheet instead.
        Keep this address private.
      </p>
    </main>
  );
}

/**
 * Bun macro, so Preact only runs at build time. The result is an Apps Script
 * HTML template expecting a `url` value.
 */
export function renderEndpointTemplate() {
  return `<script src="https://cdn.tailwindcss.com"></script>${renderToStaticMarkup(<EndpointPage />)}`;
}
