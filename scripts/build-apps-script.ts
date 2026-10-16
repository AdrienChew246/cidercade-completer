import { rm } from "node:fs/promises";

const ENTRY = "src/apps-script/index.ts";
const FUNCTIONS = "src/apps-script/functions.ts";
const UPDATER = "src/apps-script/updater.gs";
const MANIFEST = "src/apps-script/appsscript.json";
const PACKAGE_JSON = "package.json";
const OUT_DIR = "dist/apps-script";
const GLOBAL_NAME = "cidercade";
const GITHUB_REPO = "dylan-dang/cidercade-completer";
/** JSON payload consumed by updater.gs (Apps Script API updateContent). */
const RELEASE_ASSET = "cidercade-apps-script.json";

const result = await Bun.build({
  entrypoints: [ENTRY],
  target: "browser",
  format: "iife",
  conditions: ["apps-script"],
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const [bundle] = result.outputs;
if (!bundle) {
  throw new Error(`Bundling ${ENTRY} produced no output`);
}

const bundleText = await bundle.text();

// Apps Script only finds triggers, menu items and form handlers through
// top-level function declarations. Source order is kept because the editor
// preselects the first export from functions.ts.
const exports = Array.from(
  (await Bun.file(FUNCTIONS).text()).matchAll(
    /^export (?:async )?function (\w+)/gm,
  ),
  ([, name]) => name,
).filter((name): name is string => name !== undefined);

const pkg = (await Bun.file(PACKAGE_JSON).json()) as { version?: string };
const version = pkg.version;
if (!version) {
  throw new Error(`${PACKAGE_JSON} is missing "version"`);
}

const forwarders = exports
  .map(
    (name) =>
      `function ${name}(...args) {\n  return ${GLOBAL_NAME}.${name}(...args);\n}`,
  )
  .join("\n\n");

const cidercadeSource = [bundleText, forwarders].join("\n");
const manifestSource = await Bun.file(MANIFEST).text();
const updaterSource = (await Bun.file(UPDATER).text())
  .replaceAll("__CIDERCADE_VERSION__", version)
  .replaceAll("__CIDERCADE_GITHUB_REPO__", GITHUB_REPO)
  .replaceAll("__CIDERCADE_RELEASE_ASSET__", RELEASE_ASSET);

const releasePayload = {
  version,
  files: [
    { name: "appsscript", type: "JSON", source: manifestSource },
    { name: "updater", type: "SERVER_JS", source: updaterSource },
    { name: "cidercade", type: "SERVER_JS", source: cidercadeSource },
  ],
};

await rm(OUT_DIR, { recursive: true, force: true });
await Bun.write(`${OUT_DIR}/${GLOBAL_NAME}.gs`, cidercadeSource);
await Bun.write(`${OUT_DIR}/updater.gs`, updaterSource);
await Bun.write(`${OUT_DIR}/appsscript.json`, manifestSource);
await Bun.write(`dist/${RELEASE_ASSET}`, JSON.stringify(releasePayload));

console.log(
  `Built ${OUT_DIR} v${version} with ${exports.join(", ")} (release dist/${RELEASE_ASSET})`,
);
