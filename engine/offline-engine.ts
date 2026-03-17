import itemsData from "@/items.json";
import { mulberry32 } from "@/lib/rng";
import { getLevelForXp } from "@/lib/xp-calc";
import { tickSkill } from "./skill-engine";
import { simulateCombatsOffline } from "./combat-engine";
import { MAX_OFFLINE_MS, GRIMOIRE_OFFLINE_MS } from "./constants";
import type { GameState, OfflineResult, SkillId, PlayerStats } from "@/types/game";

const SKILL_IDS: SkillId[] = [
  "woodcutting",
  "mining",
  "fishing",
  "farming",
  "smithing",
  "cooking",
  "alchemy",
];

/**
 * Calculate all progress that occurred while the player was offline.
 * Uses a deterministic seeded RNG based on lastSaveAt to prevent cheating.
 */
export function calculateOfflineProgress(
  state: GameState,
  nowMs: number
): OfflineResult {
  const hasGrimoire = (state.upgrades["grimoire"] ?? 0) > 0;
  const cap = hasGrimoire ? GRIMOIRE_OFFLINE_MS : MAX_OFFLINE_MS;
  const rawDelta = nowMs - state.lastSaveAt;
  const delta = Math.min(rawDelta, cap);

  const hasWatch = (state.upgrades["adventurers_watch"] ?? 0) > 0;
  const speedMult = hasWatch ? 1.1 : 1.0;
  const effectiveDelta = delta * speedMult;

  const result: OfflineResult = {
    duration: delta,
    skills: {},
    loot: {},
    goldGained: 0,
  };

  if (effectiveDelta <= 0) return result;

  // Seeded RNG — deterministic based on disconnect timestamp
  const rng = mulberry32(state.lastSaveAt >>> 0);

  // ── Skill progression ──
  for (const skillId of SKILL_IDS) {
    const skillState = state.skills[skillId];
    if (!skillState?.activeAction) continue;

    const tickResult = tickSkill(
      skillId,
      skillState,
      state.equipment,
      effectiveDelta,
      (rng() * 0xffffffff) >>> 0,
      true
    );

    if (tickResult.actionsCompleted > 0) {
      result.skills[skillId] = {
        actionsCount: tickResult.actionsCompleted,
        xpGained: tickResult.xpGained,
        levelsGained: tickResult.levelsGained,
      };
      for (const [itemId, qty] of Object.entries(tickResult.loot)) {
        result.loot[itemId] = (result.loot[itemId] ?? 0) + qty;
      }
    }
  }

  // ── Combat offline ──
  if (state.combat.active && state.combat.zoneId) {
    const playerStats = computePlayerStats(state);
    const combatResult = simulateCombatsOffline(
      state.combat.zoneId,
      playerStats,
      playerStats.maxHp,
      effectiveDelta,
      rng
    );
    for (const [itemId, qty] of Object.entries(combatResult.loot)) {
      result.loot[itemId] = (result.loot[itemId] ?? 0) + qty;
    }
    result.goldGained += combatResult.gold;
    result.combatSummary = {
      fights: combatResult.fights,
      wins: combatResult.wins,
      deaths: combatResult.deaths,
    };
  }

  return result;
}

/** Apply offline result to game state (returns new state) */
export function applyOfflineResult(
  state: GameState,
  result: OfflineResult
): GameState {
  const newSkills = { ...state.skills };
  const newInventory = { ...state.inventory };

  for (const [skillId, skillResult] of Object.entries(result.skills)) {
    const existing = newSkills[skillId as SkillId];
    if (existing) {
      const newXp = existing.xp + skillResult.xpGained;
      newSkills[skillId as SkillId] = {
        ...existing,
        xp: newXp,
        level: getLevelForXp(newXp),
      };
    }
  }

  for (const [itemId, qty] of Object.entries(result.loot)) {
    newInventory[itemId] = (newInventory[itemId] ?? 0) + qty;
  }

  return {
    ...state,
    skills: newSkills,
    inventory: newInventory,
    gold: state.gold + result.goldGained,
    lastSaveAt: Date.now(),
  };
}

// ──────────────────────────────────────────────
// Player stats derivation
// ──────────────────────────────────────────────

interface ItemWithStats {
  id: string;
  stats?: {
    attack?: number;
    defense?: number;
    hp?: number;
    attackSpeed?: number;
    precision?: number;
    hpRegen?: number;
    blockChance?: number;
  };
}

const itemsById = new Map<string, ItemWithStats>();
for (const item of (itemsData as { items: ItemWithStats[] }).items) {
  itemsById.set(item.id, item);
}

export function computePlayerStats(state: GameState): PlayerStats {
  let equipmentAttack = 0;
  let equipmentDefense = 0;
  let hpBonus = 0;
  let attackSpeed = 2.4;
  let precision = 10;
  let equipmentHpRegen = 0;

  let activeStyle: 'attack' | 'strength' | 'ranged' | 'magic' | null = null;

  if (state.equipment.mainhand) {
    const weapon = itemsById.get(state.equipment.mainhand) as any;
    if (weapon) {
       // simple heuristic: if it's a bow/ranged, style is ranged; if staff/wand, magic; if 2h, strength; else attack
       if (weapon.category === 'weapon_ranged' || state.equipment.mainhand.includes('bow')) {
         activeStyle = 'ranged';
       } else if (weapon.category === 'weapon_magic' || state.equipment.mainhand.includes('staff') || state.equipment.mainhand.includes('wand')) {
         activeStyle = 'magic';
       } else if (state.equipment.mainhand.includes('2h') || state.equipment.mainhand.includes('great')) {
         activeStyle = 'strength';
       } else {
         activeStyle = 'attack';
       }
    }
  } else {
    activeStyle = 'attack';
  }

  for (const itemId of Object.values(state.equipment)) {
    if (!itemId) continue;
    const item = itemsById.get(itemId);
    if (!item?.stats) continue;
    equipmentAttack += item.stats.attack ?? 0;
    equipmentDefense += item.stats.defense ?? 0;
    hpBonus += item.stats.hp ?? 0;
    precision += item.stats.precision ?? 0;
    equipmentHpRegen += item.stats.hpRegen ?? 0;
    if (item.stats.attackSpeed) attackSpeed = item.stats.attackSpeed;
  }

  const constitutionLevel = state.skills.constitution?.level ?? 1;
  const attackLevel = state.skills.attack?.level ?? 1;
  const strengthLevel = state.skills.strength?.level ?? 1;
  const rangedLevel = state.skills.ranged?.level ?? 1;
  const magicLevel = state.skills.magic?.level ?? 1;
  const defenseLevel = state.skills.defense?.level ?? 1;
  const dodgeLevel = state.skills.dodge?.level ?? 1;

  let baseAttack = 0;
  if (activeStyle === 'attack') baseAttack = attackLevel;
  else if (activeStyle === 'strength') baseAttack = strengthLevel;
  else if (activeStyle === 'ranged') baseAttack = rangedLevel;
  else if (activeStyle === 'magic') baseAttack = magicLevel;

  let totalAttack = baseAttack + equipmentAttack;

  // Class bonus
  if (state.upgrades["class_bonus_warrior"]) totalAttack += totalAttack * 0.1;

  return {
    maxHp: 100 + (constitutionLevel * 10) + hpBonus,
    attack: Math.max(1, totalAttack),
    defense: (defenseLevel * 0.7) + equipmentDefense,
    dodgeChance: Math.min(dodgeLevel / 300, 0.25),
    attackSpeed,
    critChance: Math.min(precision / 200, 0.4),
    hpRegen: 2 + (constitutionLevel * 0.1) + equipmentHpRegen,
    prayerBonus: 1.0, // default, to be implemented if active prayers exist
    activeStyle,
  };
}
