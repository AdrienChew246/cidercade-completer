export type TaskStatus = "success" | "already-completed" | { error: string };

export type Task<T> = {
  name: string;
  run(): Promise<T>;
  showResult?: boolean;
  /** Defaults to "success" whenever `run` resolves. */
  getStatus?(data: T): TaskStatus;
  formatSummary?(data: T): string | undefined;
};

export type TaskOutcome = {
  name: string;
  status: TaskStatus;
  showResult?: boolean;
  durationMs: number;
  summary?: string;
};

export type GameResult<T> = T & {
  alreadyCompleted?: boolean;
};

export function markAlreadyCompleted<T>(value: T): GameResult<T> {
  return { ...value, alreadyCompleted: true };
}

export function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isTaskSuccessful(outcome: TaskOutcome) {
  return typeof outcome.status === "string";
}

export async function runTask<T>(task: Task<T>): Promise<TaskOutcome> {
  const startedAt = Date.now();

  try {
    const data = await task.run();
    const durationMs = Date.now() - startedAt;
    return {
      name: task.name,
      status: task.getStatus?.(data) ?? "success",
      showResult: task.showResult,
      durationMs,
      summary: task.formatSummary?.(data),
    };
  } catch (error) {
    const message = formatError(error);
    console.error(`[${task.name}] ${message}`);
    return {
      name: task.name,
      status: { error: message },
      showResult: task.showResult,
      durationMs: Date.now() - startedAt,
    };
  }
}
