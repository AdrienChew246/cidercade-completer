import { rm } from "node:fs/promises";

const ENTRY = "src/apps-script/index.ts";
const FUNCTIONS = "src/apps-script/functions.ts";
const MANIFEST = "src/apps-script/appsscript.json";
const OUT_DIR = "dist/apps-script";
const GLOBAL_NAME = "cidercade";

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

// Apps Script only finds triggers, menu items and doPost through top-level
// function declarations, so each export gets one forwarding into the bundle.
const { exports } = new Bun.Transpiler({ loader: "ts" }).scan(
  await Bun.file(FUNCTIONS).text(),
);
const declarations = exports.map(
  (name) =>
    `function ${name}(...args) {\n  return ${GLOBAL_NAME}.${name}(...args);\n}`,
);

await rm(OUT_DIR, { recursive: true, force: true });
await Bun.write(
  `${OUT_DIR}/${GLOBAL_NAME}.gs`,
  [await bundle.text(), ...declarations].join("\n"),
);
await Bun.write(`${OUT_DIR}/appsscript.json`, Bun.file(MANIFEST));

console.log(`Built ${OUT_DIR} with ${exports.join(", ")}`);
