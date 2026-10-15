/// <reference types="google-apps-script" />
import type { HttpRequest, HttpResponse, StateStore } from "./types";

type HttpMethod = NonNullable<HttpRequest["method"]>;

export const AUTHENTICATE_INSTRUCTIONS =
  "Submit the verification SMS to your Cidercade form (phone automation or paste it into the form and submit).";

export function getEnv(name: string) {
  return PropertiesService.getScriptProperties().getProperty(name) ?? undefined;
}

export async function sleep(ms: number) {
  Utilities.sleep(ms);
}

export async function request(
  url: string,
  { method = "GET", headers = {}, body }: HttpRequest = {},
): Promise<HttpResponse> {
  // UrlFetchApp only honors the content type through its own option.
  const { "Content-Type": contentType, ...otherHeaders } = headers;
  const res = UrlFetchApp.fetch(url, {
    method: method.toLowerCase() as Lowercase<HttpMethod>,
    headers: otherHeaders,
    muteHttpExceptions: true,
    ...(contentType ? { contentType } : {}),
    ...(body !== undefined ? { payload: body } : {}),
  });
  const status = res.getResponseCode();
  const text = res.getContentText();

  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return text;
    },
    async json() {
      return JSON.parse(text);
    },
  };
}

export function getStateStore(name: string): StateStore {
  const properties = PropertiesService.getScriptProperties();
  return {
    async load() {
      return properties.getProperty(name) ?? undefined;
    },
    async save(value) {
      properties.setProperty(name, value);
    },
  };
}
