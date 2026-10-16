import { rm } from "node:fs/promises";

const ENTRY = "src/apps-script/index.ts";
const FUNCTIONS = "src/apps-script/functions.ts";
const LOADER = "src/apps-script/loader.gs";
const MANIFEST = "src/apps-script/appsscript.json";
const PACKAGE_JSON = "package.json";
const OUT_DIR = "dist/apps-script";
const GLOBAL_NAME = "cidercade";
const GITHUB_REPO = "dylan-dang/cidercade-completer";
const RELEASE_ASSET = "cidercade-apps-script.js";
/** Simple triggers cannot call UrlFetchApp. */
const NO_UPDATE = new Set(["onOpen"]);

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
  .map((name) => {
    const allowUpdate = NO_UPDATE.has(name) ? "false" : "true";
    return (
      `function ${name}(...args) {\n` +
      `  return loadCidercade(${allowUpdate}).${name}(...args);\n` +
      `}`
    );
  })
  .join("\n\n");

const loader = (await Bun.file(LOADER).text())
  .replaceAll("__CIDERCADE_EMBEDDED_VERSION__", version)
  .replaceAll("__CIDERCADE_GITHUB_REPO__", GITHUB_REPO)
  .replaceAll("__CIDERCADE_RELEASE_ASSET__", RELEASE_ASSET)
  .replaceAll("__CIDERCADE_FORWARDERS__", forwarders);

await rm(OUT_DIR, { recursive: true, force: true });
// Embedded fallback for clasp; release asset lives beside OUT_DIR so clasp
// does not push it into the Apps Script project.
await Bun.write(`${OUT_DIR}/${GLOBAL_NAME}.gs`, bundleText);
await Bun.write(`${OUT_DIR}/loader.gs`, loader);
await Bun.write(`${OUT_DIR}/appsscript.json`, Bun.file(MANIFEST));
await Bun.write(`dist/${RELEASE_ASSET}`, bundleText);

console.log(
  `Built ${OUT_DIR} v${version} with ${exports.join(", ")} (release dist/${RELEASE_ASSET})`,
);
