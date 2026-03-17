import skillsData from "@/skills.json";
import itemsData from "@/items.json";
import { mulberry32 } from "@/lib/rng";
import { getLevelForXp } from "@/lib/xp-calc";
import { MIN_ACTION_DURATION_S } from "./constants";
import type { SkillId, SkillState } from "@/types/game";

// ──────────────────────────────────────────────
// Data types (matching actual skills.json shape)
// ──────────────────────────────────────────────

interface SkillActionOutput {
  itemId: string;
  quantity: number;
  chance: number; // 0.0–1.0
}

interface SkillAction {
  id: string;
  name: string;
  icon?: string;
  reqLevel: number; // actual field name in skills.json
  baseActionTime: number; // seconds
  xpPerAction: number;
  outputs: SkillActionOutput[];
}

interface SkillDef {
  id: string;
  name: string;
  toolSlot?: string;
  actions: SkillAction[];
}

const skillsMap = new Map<string, SkillDef>();
for (const s of (skillsData as { skills: SkillDef[] }).skills) {
  skillsMap.set(s.id, s);
}

export function getSkillDef(skillId: string): SkillDef | undefined {
  return skillsMap.get(skillId);
}

export function getAction(
  skillId: string,
  actionId: string
): SkillAction | undefined {
  return skillsMap.get(skillId)?.actions.find((a) => a.id === actionId);
}

// ──────────────────────────────────────────────
// Tool bonus
// ──────────────────────────────────────────────

interface ItemWithStats {
  id: string;
  stats?: { actionSpeedBonus?: number };
}

const itemStatsMap = new Map<string, ItemWithStats>();
for (const item of (itemsData as { items: ItemWithStats[] }).items) {
  itemStatsMap.set(item.id, item);
}

/** Tool speed bonus (0.0–0.40) from equipped tool */
export function getToolBonus(
  equipment: Record<string, string | null>,
  skillId: string
): number {
  const skill = skillsMap.get(skillId);
  const slotId = skill?.toolSlot ?? `tool_${skillId}`;
  const toolId = equipment[slotId];
  if (!toolId) return 0;
  return itemStatsMap.get(toolId)?.stats?.actionSpeedBonus ?? 0;
}

/** Effective action duration in ms */
export function getActionDurationMs(
  action: SkillAction,
  toolBonus: number,
  talentMultiplier = 1.0
): number {
  const seconds = Math.max(
    MIN_ACTION_DURATION_S,
    action.baseActionTime * (1 - toolBonus) * talentMultiplier
  );
  return seconds * 1000;
}

// ──────────────────────────────────────────────
// Tick: process skill progression over delta ms
// ──────────────────────────────────────────────

export interface SkillTickResult {
  xpGained: number;
  levelsGained: number;
  loot: Record<string, number>;
  actionsCompleted: number;
  newLevel: number;
}

export function tickSkill(
  skillId: SkillId,
  state: SkillState,
  equipment: Record<string, string | null>,
  deltaMs: number,
  rngSeed: number,
  isOffline = false
): SkillTickResult {
  const currentLevel = getLevelForXp(state.xp);
  const result: SkillTickResult = {
    xpGained: 0,
    levelsGained: 0,
    loot: {},
    actionsCompleted: 0,
    newLevel: currentLevel,
  };

  if (!state.activeAction) return result;

  const action = getAction(skillId, state.activeAction);
  if (!action) return result;

  if (currentLevel < action.reqLevel) return result;

  const toolBonus = getToolBonus(equipment, skillId);
  const durationMs = getActionDurationMs(action, toolBonus);
  const count = Math.floor(deltaMs / durationMs);
  if (count === 0) return result;

  result.actionsCompleted = count;
  result.xpGained = count * action.xpPerAction;

  // Drops with seeded RNG
  const rng = mulberry32(rngSeed >>> 0);
  for (let i = 0; i < count; i++) {
    for (const output of action.outputs) {
      if (rng() < output.chance) {
        result.loot[output.itemId] =
          (result.loot[output.itemId] ?? 0) + output.quantity;
      }
    }
  }

  const oldLevel = currentLevel;
  const newLevel = getLevelForXp(state.xp + result.xpGained);
  result.newLevel = newLevel;
  result.levelsGained = newLevel - oldLevel;

  return result;
}

/** All actions available to a skill at given level */
export function getAvailableActions(
  skillId: string,
  level: number
): SkillAction[] {
  const skill = skillsMap.get(skillId);
  if (!skill || !skill.actions) return [];
  return skill.actions.filter((a) => level >= a.reqLevel);
}
