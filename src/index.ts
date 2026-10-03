import { candyBlastTask } from "./candy-blast";
import { postRunSummary } from "./discord";
import { lootBoxTask } from "./loot-box";
import { formatError, isTaskSuccessful, runTask, type Task } from "./task";
import { wotdTask } from "./wotd";

const Authorization = `Token ${process.env.TOKEN}`;

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  "X-Brand-Host": "rewards.cidercade.com",
  Authorization,
  "X-Brand-Subdomain": "",
};

const BASE_URL = "https://loyalty-api.hang.com/api/v2/end-users/";

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
  const url = new URL(path, BASE_URL).toString();
  const res = await fetch(url, {
    credentials: "include",
    headers,
    method,
    mode: "cors",
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

async function* runSequentially(tasks: Task<unknown>[]) {
  for (const task of tasks) {
    yield await runTask(task);
  }
}

async function main() {
  if (!process.env.TOKEN) {
    throw new Error("TOKEN is not set in the environment");
  }

  const outcomes = await Array.fromAsync(
    runSequentially([wotdTask, candyBlastTask, lootBoxTask]),
  );

  try {
    await postRunSummary(outcomes);
  } catch (error) {
    console.error(`Discord notification failed: ${formatError(error)}`);
  }

  if (!outcomes.every(isTaskSuccessful)) {
    process.exit(1);
  }
}

await main();
