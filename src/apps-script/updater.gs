/**
 * Bootstrap that can rewrite this Apps Script project from a GitHub release
 * via the Apps Script API. Kept separate from the main bundle so a bad
 * release can still be repaired by another update.
 *
 * Placeholders replaced by scripts/build-apps-script.ts:
 *   __CIDERCADE_VERSION__
 *   __CIDERCADE_GITHUB_REPO__
 *   __CIDERCADE_RELEASE_ASSET__
 */

var CIDERCADE_VERSION = "__CIDERCADE_VERSION__";
var CIDERCADE_GITHUB_REPO = "__CIDERCADE_GITHUB_REPO__";
var CIDERCADE_RELEASE_ASSET = "__CIDERCADE_RELEASE_ASSET__";
var CIDERCADE_UPDATE_CHECK_PROPERTY = "CIDERCADE_UPDATE_CHECKED_AT";
/** Avoid hammering GitHub on every dialog click. */
var CIDERCADE_UPDATE_CHECK_MS = 6 * 60 * 60 * 1000;

function cidercadeParseVersion_(version) {
  var normalized = String(version || "")
    .replace(/^v/i, "")
    .split("-")[0];
  var parts = normalized.split(".").map(function (part) {
    return parseInt(part, 10);
  });
  if (
    !parts.length ||
    parts.some(function (n) {
      return isNaN(n);
    })
  ) {
    return null;
  }
  return parts;
}

function cidercadeIsNewer_(remote, installed) {
  var a = cidercadeParseVersion_(remote);
  var b = cidercadeParseVersion_(installed);
  if (!a) return false;
  if (!b) return true;
  var len = Math.max(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var x = a[i] || 0;
    var y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

function cidercadeLatestTag_() {
  var response = UrlFetchApp.fetch(
    "https://github.com/" + CIDERCADE_GITHUB_REPO + "/releases/latest",
    { followRedirects: false, muteHttpExceptions: true },
  );
  var code = response.getResponseCode();
  if (code !== 302 && code !== 301) return null;
  var headers = response.getHeaders();
  var location = headers.Location || headers.location;
  if (!location) return null;
  var match = /\/releases\/tag\/([^/?#]+)/.exec(location);
  return match ? decodeURIComponent(match[1]) : null;
}

function cidercadeFetchReleasePayload_(tag) {
  var url =
    "https://github.com/" +
    CIDERCADE_GITHUB_REPO +
    "/releases/download/" +
    encodeURIComponent(tag) +
    "/" +
    CIDERCADE_RELEASE_ASSET;
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(
      "HTTP " + code + " downloading " + CIDERCADE_RELEASE_ASSET,
    );
  }
  var payload = JSON.parse(response.getContentText());
  if (!payload || !payload.files || !payload.files.length) {
    throw new Error("Release asset missing files[]");
  }
  var names = {};
  for (var i = 0; i < payload.files.length; i++) {
    names[payload.files[i].name] = true;
  }
  if (!names.appsscript || !names.updater || !names.cidercade) {
    throw new Error(
      "Release must include appsscript, updater, and cidercade files",
    );
  }
  return payload;
}

function cidercadePushProjectFiles_(files) {
  var scriptId = ScriptApp.getScriptId();
  var response = UrlFetchApp.fetch(
    "https://script.googleapis.com/v1/projects/" + scriptId + "/content",
    {
      method: "put",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ files: files }),
      muteHttpExceptions: true,
    },
  );
  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(
      "Apps Script API update failed (" +
        code +
        "): " +
        response.getContentText(),
    );
  }
}

function cidercadeShouldSkipUpdateCheck_(force) {
  if (force) return false;
  var raw = PropertiesService.getScriptProperties().getProperty(
    CIDERCADE_UPDATE_CHECK_PROPERTY,
  );
  var checkedAt = raw ? Number(raw) : 0;
  return (
    checkedAt && Date.now() - checkedAt < CIDERCADE_UPDATE_CHECK_MS
  );
}

function cidercadeMarkUpdateChecked_() {
  PropertiesService.getScriptProperties().setProperty(
    CIDERCADE_UPDATE_CHECK_PROPERTY,
    String(Date.now()),
  );
}

/**
 * Checks GitHub for a newer release and rewrites this project when found.
 * The current execution keeps running the old code; the next run uses the update.
 *
 * @param {{ force?: boolean }=} options
 * @returns {{ updated: boolean, version: string, tag?: string }}
 */
function cidercadeMaybeUpdate_(options) {
  var force = options && options.force;
  if (cidercadeShouldSkipUpdateCheck_(force)) {
    return { updated: false, version: CIDERCADE_VERSION };
  }

  try {
    var tag = cidercadeLatestTag_();
    cidercadeMarkUpdateChecked_();
    if (!tag || !cidercadeIsNewer_(tag, CIDERCADE_VERSION)) {
      return { updated: false, version: CIDERCADE_VERSION };
    }

    var payload = cidercadeFetchReleasePayload_(tag);
    cidercadePushProjectFiles_(payload.files);
    console.log(
      "Updated Cidercade Completer from " +
        CIDERCADE_VERSION +
        " to " +
        tag +
        " via Apps Script API",
    );
    return {
      updated: true,
      version: payload.version || tag.replace(/^v/i, ""),
      tag: tag,
    };
  } catch (error) {
    console.error(
      "Cidercade Completer update failed (installed " +
        CIDERCADE_VERSION +
        "): " +
        error,
    );
    return { updated: false, version: CIDERCADE_VERSION };
  }
}

/** Menu: force an update check and show the result. */
function checkForUpdates() {
  var result = cidercadeMaybeUpdate_({ force: true });
  var ui = DocumentApp.getUi();
  if (result.updated) {
    ui.alert(
      "Updated to " +
        (result.tag || result.version) +
        ". Close any open dialogs, then use the menu again for the new version.",
    );
    return;
  }
  ui.alert("Already up to date (v" + result.version + ").");
}
