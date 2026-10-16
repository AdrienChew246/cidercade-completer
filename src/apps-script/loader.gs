/**
 * Thin entrypoints for the Doc-bound project. Tries a newer GitHub release
 * asset first; falls back to the embedded cidercade.gs bundle.
 * Build substitutes version, repo, asset name, and top-level forwarders.
 */

var CIDERCADE_EMBEDDED_VERSION = "__CIDERCADE_EMBEDDED_VERSION__";
var CIDERCADE_GITHUB_REPO = "__CIDERCADE_GITHUB_REPO__";
var CIDERCADE_RELEASE_ASSET = "__CIDERCADE_RELEASE_ASSET__";

var cidercadeRuntime_ = null;

function cidercadeParseVersion_(version) {
  var normalized = String(version || "")
    .replace(/^v/i, "")
    .split("-")[0];
  var parts = normalized.split(".").map(function (part) {
    return parseInt(part, 10);
  });
  if (!parts.length || parts.some(function (n) {
    return isNaN(n);
  })) {
    return null;
  }
  return parts;
}

function cidercadeIsNewer_(remote, embedded) {
  var a = cidercadeParseVersion_(remote);
  var b = cidercadeParseVersion_(embedded);
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

function cidercadeFetchRelease_(tag) {
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
    throw new Error("HTTP " + code + " downloading " + CIDERCADE_RELEASE_ASSET);
  }
  return response.getContentText();
}

function cidercadeApplyRelease_(source) {
  var previous = cidercade;
  eval(source);
  if (
    typeof cidercade !== "object" ||
    cidercade === null ||
    typeof cidercade.runDailyTasks !== "function"
  ) {
    cidercade = previous;
    throw new Error("Release asset did not define cidercade exports");
  }
}

/**
 * @param {boolean} allowUpdate simple triggers (onOpen) cannot UrlFetch
 */
function loadCidercade(allowUpdate) {
  if (cidercadeRuntime_) return cidercadeRuntime_;

  if (allowUpdate) {
    try {
      var tag = cidercadeLatestTag_();
      if (tag && cidercadeIsNewer_(tag, CIDERCADE_EMBEDDED_VERSION)) {
        cidercadeApplyRelease_(cidercadeFetchRelease_(tag));
        console.log(
          "Loaded Cidercade Completer " + tag + " from GitHub (embedded was " +
            CIDERCADE_EMBEDDED_VERSION +
            ")",
        );
      }
    } catch (error) {
      console.error(
        "Cidercade Completer update failed; using embedded " +
          CIDERCADE_EMBEDDED_VERSION +
          ": " +
          error,
      );
    }
  }

  cidercadeRuntime_ = cidercade;
  return cidercadeRuntime_;
}

__CIDERCADE_FORWARDERS__
