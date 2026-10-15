const EXAMPLE_BODY = JSON.stringify(
  { message: "Your Cidercade verification code is: 123456" },
  null,
  2,
);

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderField(label: string, value: string) {
  return `
    <div class="grid grid-cols-[7rem_1fr] gap-2 py-2">
      <dt class="font-medium text-slate-500">${label}</dt>
      <dd class="break-all font-mono text-sm">${escapeHtml(value)}</dd>
    </div>`;
}

export function renderEndpointPage(url: string) {
  return `
    <script src="https://cdn.tailwindcss.com"></script>
    <main class="mx-auto max-w-xl p-6 font-sans text-slate-800">
      <h1 class="text-2xl font-bold">Cidercade Completer</h1>
      <p class="mt-3">
        This address receives Cidercade verification codes so your daily tasks
        can keep running. There is nothing to do on this page.
      </p>

      <h2 class="mt-8 text-lg font-semibold">Phone automation</h2>
      <p class="mt-2">
        When the verification text arrives, have your phone automation send it
        here (iOS Shortcuts: <strong>Get Contents of URL</strong>, MacroDroid:
        <strong>HTTP Request</strong>):
      </p>
      <dl class="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 px-4">
        ${renderField("URL", url)}
        ${renderField("Method", "POST")}
        ${renderField("Body", "JSON")}
        ${renderField("Field", "message = the verification text")}
      </dl>

      <p class="mt-4">The request body should look like:</p>
      <pre class="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-sm">${escapeHtml(EXAMPLE_BODY)}</pre>

      <p class="mt-8 text-sm text-slate-500">
        Without an automation, paste the text into
        <strong>Cidercade &rarr; Authenticate</strong> in the spreadsheet instead.
        Keep this address private.
      </p>
    </main>`;
}
