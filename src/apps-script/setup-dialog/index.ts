import { readFileSync } from "node:fs";
import { ROOT_ID } from "./shared";

const CLIENT_ENTRY = `${import.meta.dir}/client.tsx`;
const STYLES_ENTRY = `${import.meta.dir}/styles.css`;

function buildClientScript() {
  // Bun.build deadlocks when called from a macro, so the CLI bundles instead.
  const build = Bun.spawnSync([
    process.execPath,
    "build",
    CLIENT_ENTRY,
    "--target=browser",
    "--format=iife",
    "--minify",
  ]);
  if (build.exitCode !== 0) {
    throw new Error(`Bundling ${CLIENT_ENTRY} failed:\n${build.stderr}`);
  }

  const script = build.stdout.toString();
  // An inline script ends at the first "</script" no matter where it appears.
  if (script.includes("</script")) {
    throw new Error(`${CLIENT_ENTRY} cannot be inlined into a script tag`);
  }
  return script;
}

/**
 * Bun macro, so the dialog's client code and CSS are inlined into the script.
 * The result still needs the initial form JSON placed before it.
 */
export function renderSetupDialog() {
  const css = readFileSync(STYLES_ENTRY, "utf8");
  if (css.includes("</style")) {
    throw new Error(`${STYLES_ENTRY} cannot be inlined into a style tag`);
  }

  return `<style>${css}</style><div id="${ROOT_ID}"></div><script>${buildClientScript()}</script>`;
}
