import type { HttpRequest, HttpResponse, StateStore } from "./types";

const GITHUB_API_URL = "https://api.github.com/repos/";

export const AUTHENTICATE_INSTRUCTIONS =
  "Run the **Authenticate Cidercade** workflow with the verification SMS.";

export function getEnv(name: string) {
  return process.env[name];
}

export function sleep(ms: number) {
  return Bun.sleep(ms);
}

export function request(
  url: string,
  init?: HttpRequest,
): Promise<HttpResponse> {
  return fetch(url, init);
}

function createGitHubVariableStore(
  repo: string,
  token: string,
  name: string,
): StateStore {
  function githubRequest(method: string, path: string, body?: unknown) {
    return fetch(new URL(`${repo}/actions/variables${path}`, GITHUB_API_URL), {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  async function assertOk(res: Response, action: string) {
    if (!res.ok) {
      throw new Error(
        `Failed to ${action} ${name} variable (${res.status}): ${await res.text()}`,
      );
    }
  }

  return {
    async load() {
      const res = await githubRequest("GET", `/${name}`);
      if (res.status === 404) return undefined;
      await assertOk(res, "read");
      const { value } = (await res.json()) as { value: string };
      return value;
    },
    async save(value) {
      const body = { name, value };
      const updated = await githubRequest("PATCH", `/${name}`, body);
      if (updated.status !== 404) {
        await assertOk(updated, "update");
        return;
      }
      await assertOk(await githubRequest("POST", "", body), "create");
    },
  };
}

function createFileStore(path: string): StateStore {
  return {
    async load() {
      const file = Bun.file(path);
      return (await file.exists()) ? file.text() : undefined;
    },
    async save(value) {
      await Bun.write(path, value);
    },
  };
}

/** Resolves to `undefined` when state cannot be persisted between runs. */
export function getStateStore(name: string): StateStore | undefined {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_PAT;

  if (repo && token) {
    return createGitHubVariableStore(repo, token, name);
  }

  // On GitHub Actions the runner is wiped after each run, so tracking is
  // opt-in by setting GH_PAT.
  if (process.env.GITHUB_ACTIONS === "true") {
    return undefined;
  }

  return createFileStore(`.${name.toLowerCase().replaceAll("_", "-")}.json`);
}
