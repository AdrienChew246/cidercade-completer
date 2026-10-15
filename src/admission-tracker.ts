import { getStateStore } from "#runtime";
import { getEndUsers } from "./api";

export const PIECES_PER_ADMISSION = 4;

const STATE_NAME = "ADMISSION_PIECES";

type Activity = {
  date: number;
  type: string;
  description?: string;
};

type ActivityResponse = {
  activity_history: Activity[];
};

export type AdmissionPieceState = {
  count: number;
  /** Pieces earned since tracking started, ignoring any consumed. */
  totalEarned: number;
  /** Unix seconds; ledger activity after this has not been applied yet. */
  updatedAt: number;
};

function parseState(value: string): AdmissionPieceState {
  const state = JSON.parse(value) as Partial<AdmissionPieceState>;
  if (typeof state.count !== "number" || typeof state.updatedAt !== "number") {
    throw new Error(
      `${STATE_NAME} must look like {"count":0,"totalEarned":0,"updatedAt":0}, got ${value}`,
    );
  }
  return {
    count: state.count,
    // States saved before totalEarned existed only know the current count.
    totalEarned: state.totalEarned ?? state.count,
    updatedAt: state.updatedAt,
  };
}

function isAdmissionPieceRedemption(activity: Activity) {
  return (
    activity.type === "redemption" &&
    /admission.*puzzle piece/i.test(activity.description ?? "")
  );
}

async function countPiecesConsumedSince(since: number) {
  const { activity_history } = await getEndUsers<ActivityResponse>("activity");
  return activity_history.filter(
    (activity) => activity.date > since && isAdmissionPieceRedemption(activity),
  ).length;
}

type StartedPuzzle = {
  name: string;
  pieces: { is_complete: boolean }[];
};

/** Pieces already placed on the in-progress puzzle, before this run's loot boxes. */
export async function readUnsetAdmissionBase() {
  const store = getStateStore(STATE_NAME);
  if (!store || (await store.load())) return 0;

  const { puzzles } = await getEndUsers<{ puzzles: StartedPuzzle[] }>(
    "puzzles?started=true",
  );
  const admission = puzzles.find((puzzle) => /admission/i.test(puzzle.name));
  const complete =
    admission?.pieces.filter((piece) => piece.is_complete).length ?? 0;
  // A full puzzle is claimable, not leftover inventory, and 0 means nothing started.
  return complete >= 1 && complete < PIECES_PER_ADMISSION ? complete : 0;
}

/** Resolves to `undefined` when tracking is not enabled. */
export async function updateAdmissionPieces(earned: number, unsetBase = 0) {
  const store = getStateStore(STATE_NAME);
  if (!store) return undefined;

  const saved = await store.load();
  const checkedAt = Math.floor(Date.now() / 1000);

  let count = unsetBase + earned;
  let totalEarned = earned;
  if (saved) {
    const previous = parseState(saved);
    const consumed = await countPiecesConsumedSince(previous.updatedAt);
    // Pieces consumed beyond our count were earned before tracking started.
    count = Math.max(previous.count - consumed, 0) + earned;
    totalEarned = previous.totalEarned + earned;
  }

  const state: AdmissionPieceState = {
    count,
    totalEarned,
    updatedAt: checkedAt,
  };
  await store.save(JSON.stringify(state));
  return state;
}
