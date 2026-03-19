import milestonesData from "../character_milestones.json";
import { calculateGlobalLevels } from "@/lib/xp-calc";
import type { GameState } from "@/types/game";

export interface Milestone {
  level: number;
  label: string;
  description: string;
  unlocks: string[];
}

const MILESTONES: Milestone[] = milestonesData as Milestone[];

/**
 * Returns all milestones reached based on the current game state
 */
export function getReachedMilestones(state: GameState): Milestone[] {
  const { totalLevel } = calculateGlobalLevels(state.skills);
  return MILESTONES.filter((m) => totalLevel >= m.level);
}

/**
 * Returns the next upcoming milestone
 */
export function getNextMilestone(state: GameState): Milestone | null {
  const { totalLevel } = calculateGlobalLevels(state.skills);
  return MILESTONES.find((m) => m.level > totalLevel) || null;
}

/**
 * Checks if any NEW milestones have been reached and returns them.
 * This can be used to trigger notifications.
 */
export function checkNewMilestones(
  oldTotalLevel: number,
  newTotalLevel: number
): Milestone[] {
  return MILESTONES.filter(
    (m) => m.level > oldTotalLevel && m.level <= newTotalLevel
  );
}
