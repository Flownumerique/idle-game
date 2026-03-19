import skillsData from "../skills.json";
import { PROFESSION_SKILL_IDS, COMBAT_SKILL_IDS } from "../types/game";
import type { SkillId, SkillState } from "../types/game";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawXpTable: Record<string, unknown> = (skillsData as any).xpTable;
const XP_TABLE_RAW: Record<string, number> = Object.fromEntries(
  Object.entries(rawXpTable)
    .filter(([k, v]) => !isNaN(Number(k)) && typeof v === "number")
    .map(([k, v]) => [k, v as number])
);

const MASTERY_MAX = 120;

/**
 * Pre-calculated full XP table from level 0 to MASTERY_MAX.
 * Uses linear interpolation for gaps and linear extrapolation for levels beyond the raw table.
 */
const FULL_XP_TABLE: number[] = new Array(MASTERY_MAX + 1).fill(0);

(function populateTable() {
  const sortedLevels = Object.keys(XP_TABLE_RAW)
    .map(Number)
    .sort((a, b) => a - b);

  if (sortedLevels.length === 0) return;

  // Fill known values from the raw table
  for (const level of sortedLevels) {
    if (level <= MASTERY_MAX) {
      FULL_XP_TABLE[level] = XP_TABLE_RAW[String(level)];
    }
  }

  // Fill gaps between known values using linear interpolation
  for (let i = 0; i < sortedLevels.length - 1; i++) {
    const low = sortedLevels[i];
    const high = sortedLevels[i + 1];
    const lowXp = XP_TABLE_RAW[String(low)];
    const highXp = XP_TABLE_RAW[String(high)];

    for (let l = low + 1; l < high && l <= MASTERY_MAX; l++) {
      const progress = (l - low) / (high - low);
      FULL_XP_TABLE[l] = Math.floor(lowXp + (highXp - lowXp) * progress);
    }
  }

  // Extrapolate beyond the last known value in the table
  const maxKnownLevel = sortedLevels[sortedLevels.length - 1];
  if (maxKnownLevel < MASTERY_MAX) {
    const secondMaxKnownLevel = sortedLevels[sortedLevels.length - 2] || 0;
    const maxXp = XP_TABLE_RAW[String(maxKnownLevel)];
    const secondMaxXp = secondMaxKnownLevel > 0 ? XP_TABLE_RAW[String(secondMaxKnownLevel)] : 0;
    const slope = (maxXp - secondMaxXp) / (maxKnownLevel - secondMaxKnownLevel);

    for (let l = maxKnownLevel + 1; l <= MASTERY_MAX; l++) {
      FULL_XP_TABLE[l] = Math.floor(maxXp + slope * (l - maxKnownLevel));
    }
  }
})();

/** Total XP required to reach a given level */
export function getXpForLevel(level: number): number {
  const clamped = Math.min(Math.max(1, Math.floor(level)), MASTERY_MAX);
  return FULL_XP_TABLE[clamped];
}

/** XP needed to advance from level to level+1 */
export function getXpToNextLevel(level: number): number {
  if (level >= MASTERY_MAX) return Infinity;
  return getXpForLevel(level + 1) - getXpForLevel(level);
}

/** Derive current level from total accumulated XP */
export function getLevelForXp(totalXp: number): number {
  let level = 1;
  for (let l = 2; l <= MASTERY_MAX; l++) {
    if (totalXp >= FULL_XP_TABLE[l]) {
      level = l;
    } else {
      break;
    }
  }
  return level;
}

/** XP progress within current level: 0.0–1.0 */
export function getLevelProgress(totalXp: number): number {
  const level = getLevelForXp(totalXp);
  if (level >= MASTERY_MAX) return 1;
  const xpAtLevel = getXpForLevel(level);
  const needed = getXpToNextLevel(level);

  // Mathematical invariant: getLevelForXp ensures we never evaluate a level
  // where needed <= 0, and MASTERY_MAX check catches Infinity.
  // This check is purely defensive for corrupted state/inputs.
  /* istanbul ignore if -- @preserve */
  if (needed <= 0 || !isFinite(needed)) return 1;

  return Math.min((totalXp - xpAtLevel) / needed, 1);
}

/**
 * Calculates sum of levels for different categories
 */
export function calculateGlobalLevels(skills: Record<SkillId, SkillState>) {
  let professionLevel = 0;
  let combatLevel = 0;

  for (const id of PROFESSION_SKILL_IDS) {
    const xp = skills[id]?.xp ?? 0;
    professionLevel += getLevelForXp(xp);
  }

  for (const id of COMBAT_SKILL_IDS) {
    const xp = skills[id]?.xp ?? 0;
    combatLevel += getLevelForXp(xp);
  }

  return {
    professionLevel,
    combatLevel,
    totalLevel: professionLevel + combatLevel,
  };
}
