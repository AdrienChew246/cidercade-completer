import { postEndUsers } from "..";
import { type GameResult, markAlreadyCompleted, type Task } from "../task";
import { getBestGuess } from "./solver";
export type LetterDelta = {
  provided: string;
  found_in_word: boolean;
  position_correct: boolean;
};

export type WOTDAttempt = {
  locked: boolean;
  letter_deltas: LetterDelta[] | null;
};

export type WOTDResponse = {
  solved: boolean;
  next_start_at: number;
  attempts: WOTDAttempt[];
  period: string;
};

export async function solveWOTD(): Promise<GameResult<WOTDResponse>> {
  let wotd = await postEndUsers<WOTDResponse>("wotd");

  if (wotd.solved) {
    return markAlreadyCompleted(wotd);
  }
  // check in if attempts are locked
  if (wotd.attempts.some((attempt) => attempt.locked)) {
    await postEndUsers("wotd/check-in", { lat: 30.252545, lng: -97.74123199 });
  }

  while (
    !wotd.solved &&
    wotd.attempts.some((attempt) => attempt.letter_deltas === null)
  ) {
    const guess = getBestGuess(wotd.attempts);
    if (!guess) {
      throw new Error(
        "Solver could not produce a guess for the remaining words",
      );
    }

    wotd = await postEndUsers<WOTDResponse>("wotd/attempt", { guess });
  }

  return wotd;
}

function formatWotdGuesses(wotd: WOTDResponse) {
  const lines = wotd.attempts
    .filter((attempt) => attempt.letter_deltas !== null)
    .map((attempt) => {
      const deltas = attempt.letter_deltas ?? [];
      const guess = deltas
        .map((delta) => delta.provided.toUpperCase())
        .join("");
      const tiles = deltas
        .map((delta) =>
          delta.position_correct ? "🟩" : delta.found_in_word ? "🟨" : "⬛",
        )
        .join("");
      return `${tiles} ${guess}`;
    });

  return lines.length > 0 ? lines.join("\n") : "_No guesses recorded_";
}

export const wotdTask: Task<GameResult<WOTDResponse>> = {
  name: "Word of the Day",
  showResult: true,
  run: solveWOTD,
  getStatus(data) {
    if (data.alreadyCompleted) return "already-completed";
    return data.solved ? "success" : { error: "Failed to solve" };
  },
  formatSummary: formatWotdGuesses,
};
