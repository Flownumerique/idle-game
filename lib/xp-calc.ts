import skillsData from "@/skills.json";

// xpTable is a dict: {"1": 0, "2": 83, ..., "_comment": "..."}
// Filter out non-numeric keys
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawXpTable: Record<string, unknown> = (skillsData as any).xpTable;
const XP_TABLE: Record<string, number> = Object.fromEntries(
  Object.entries(rawXpTable)
    .filter(([k, v]) => !isNaN(Number(k)) && typeof v === "number")
    .map(([k, v]) => [k, v as number])
);
const MAX_LEVEL = 99;
const MASTERY_MAX = 120;

/** Total XP required to reach a given level */
export function getXpForLevel(level: number): number {
  const clamped = Math.min(Math.max(1, level), MASTERY_MAX);
  return XP_TABLE[String(clamped)] ?? 0;
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
    if (totalXp >= getXpForLevel(l)) {
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
  if (needed <= 0 || !isFinite(needed)) return 1;
  return Math.min((totalXp - xpAtLevel) / needed, 1);
}
