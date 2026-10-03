import { postEndUsers } from ".";
import type { Task } from "./task";

const LOOT_BOX_PATH = "loot-boxes/3a623991-6a4e-448e-9a11-40cc53e3b9fb/open";
/** Loot boxes earned by earlier tasks take a moment to become redeemable. */
const LOOT_BOX_SETTLE_DELAY_MS = 1500;

type PuzzlePiece = {
  reward_id: number;
  slot: number;
  is_complete: boolean;
};

type Puzzle = {
  id: string;
  name: string;
  description: string;
  pieces: PuzzlePiece[];
  earn_instructions: string;
  image_url: string;
  rewards: unknown[];
  loot_boxes: unknown[];
  status: string;
  archived_at: string | number | null;
  published_at: string;
};

type Reward = {
  id: number;
  uuid: string;
  name: string;
  puzzle: Puzzle;
};

type LootBoxRewardChoice = {
  id: string;
  title: string;
  subtitle: string;
};

export type LootBoxRewardOutcome = {
  allocated_loot_box_id: string;
  loot_box_reward_choice: LootBoxRewardChoice;
  reward: Reward;
  rewards: Reward[];
};

export type LootBoxRewardResponse = {
  loot_box_reward_outcome: LootBoxRewardOutcome;
  rewards: Reward[];
};

function isLootBoxUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Allocated loot box not found or already redeemed");
}

export async function redeemAllLootBoxes(
  open: () => Promise<LootBoxRewardResponse>,
) {
  const outcomes: LootBoxRewardResponse[] = [];

  while (true) {
    try {
      outcomes.push(await open());
    } catch (error) {
      if (isLootBoxUnavailable(error)) {
        break;
      }

      throw error;
    }
  }

  return outcomes;
}

function getPieceLabel(outcome: LootBoxRewardOutcome) {
  return (
    outcome.reward.puzzle?.name ??
    outcome.reward.name ??
    outcome.loot_box_reward_choice.title
  );
}

function groupEarnedPieces(outcomes: LootBoxRewardResponse[]) {
  const counts = new Map<string, number>();

  for (const outcome of outcomes) {
    const label = getPieceLabel(outcome.loot_box_reward_outcome);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return counts;
}

function formatLootRewardSummary(outcomes: LootBoxRewardResponse[]) {
  if (outcomes.length === 0) {
    return undefined;
  }

  const lines = ["**You earned**"];
  const earnedPieces = groupEarnedPieces(outcomes);

  for (const [label, count] of earnedPieces) {
    const prefix = count > 1 ? `${count}x ` : "";
    lines.push(`- ${prefix}${label} 🧩`);
  }

  return lines.join("\n");
}

export const lootBoxTask: Task<LootBoxRewardResponse[]> = {
  name: "Loot Boxes",
  async run() {
    await Bun.sleep(LOOT_BOX_SETTLE_DELAY_MS);
    return redeemAllLootBoxes(() =>
      postEndUsers<LootBoxRewardResponse>(LOOT_BOX_PATH),
    );
  },
  formatSummary: formatLootRewardSummary,
};
