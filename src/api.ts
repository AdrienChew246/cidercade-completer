import { getEnv, request } from "#runtime";

const BASE_URL = "https://loyalty-api.hang.com/api/v2/end-users/";

function getHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "X-Brand-Host": "rewards.cidercade.com",
    Authorization: `Token ${getEnv("TOKEN")}`,
    "X-Brand-Subdomain": "",
  };
}

type ApiErrorBody = {
  error?: string;
  message?: string;
};

function getApiErrorMessage(body: unknown, status: number) {
  if (body && typeof body === "object") {
    const apiError = body as ApiErrorBody;
    if (apiError.error) return apiError.error;
    if (apiError.message) return apiError.message;
  }

  return `Request failed with status ${status}`;
}

export async function fetchEndUsers<T = unknown>(
  method: "POST" | "GET",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await request(`${BASE_URL}${path}`, {
    headers: getHeaders(),
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error(
      `${method} ${path} returned a non-JSON response (${res.status})`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `${method} ${path}: ${getApiErrorMessage(json, res.status)}`,
    );
  }

  if (json && typeof json === "object" && "error" in json) {
    const message = (json as ApiErrorBody).error;
    if (message) {
      throw new Error(`${method} ${path}: ${message}`);
    }
  }

  return json as T;
}

export async function postEndUsers<T = unknown>(path: string, body?: unknown) {
  return fetchEndUsers<T>("POST", path, body);
}

export async function getEndUsers<T = unknown>(path: string) {
  return fetchEndUsers<T>("GET", path);
}
