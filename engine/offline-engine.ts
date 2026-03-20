import itemsData from "../items.json"
import { mulberry32 } from "../lib/rng"
import { getLevelForXp } from "../lib/xp-calc"
import { tickSkill } from "./skill-engine"
import { simulateCombatsOffline } from "./combat-engine"
import { MAX_OFFLINE_MS, GRIMOIRE_OFFLINE_MS } from "./constants"
import { GameState, OfflineResult, SkillId, PlayerStats, ItemDrop } from "../types/game"
import { GameData } from "./data-loader"
import { FLAGS } from "../lib/feature-flags"

const SKILL_IDS: SkillId[] = [
  "woodcutting",
  "mining",
  "fishing",
  "farming",
  "smithing",
  "cooking",
  "alchemy",
]

function validateDelta(rawDelta: number, hasGrimoire: boolean): number {
  if (!Number.isFinite(rawDelta) || rawDelta < 0) {
    console.error('[Offline] Invalid delta:', rawDelta)
    return 0
  }
  const cap = hasGrimoire ? GRIMOIRE_OFFLINE_MS : MAX_OFFLINE_MS
  return Math.min(rawDelta, cap)
}

function safeXp(base: number, count: number): number {
  const result = base * count
  if (!Number.isFinite(result) || result < 0) return 0
  return Math.floor(result)
}

function applyOfflineLoot(store: GameState, loot: Record<string, number>): string[] {
  const warnings: string[] = []
  for (const [itemId, qty] of Object.entries(loot)) {
    if (!Number.isFinite(qty) || qty <= 0) {
      warnings.push(`Invalid qty for ${itemId}`)
      continue
    }
    const current = store.inventory[itemId] ?? 0
    let item
    try {
      item = GameData.item(itemId)
    } catch {
      warnings.push(`Unknown item: ${itemId}`)
      continue
    }
    const maxStack = item.stackMax ?? 999
    const spaceLeft = Math.max(0, maxStack - current)
    const capped = Math.min(qty, spaceLeft)
    if (capped < qty) {
      warnings.push(`Stack overflow: ${itemId} (lost ${qty - capped})`)
    }
    if (capped > 0) {
      store.inventory[itemId] = current + capped
      if (!store.discoveredItems.includes(itemId)) {
        store.discoveredItems.push(itemId)
      }
    }
  }
  return warnings
}

export function calculateOfflineProgress(state: GameState, nowMs: number): OfflineResult {
  const result: OfflineResult = {
    duration: 0,
    skills: {},
    loot: {},
    consumed: {}, // Added
    goldGained: 0,
  }

  const rawDelta = nowMs - state.lastSaveAt
  const hasGrimoire = (state.upgrades["grimoire"] ?? 0) > 0
  const delta = validateDelta(rawDelta, hasGrimoire)

  if (delta <= 0) return result

  const hasWatch = (state.upgrades["adventurers_watch"] ?? 0) > 0
  const speedMult = hasWatch ? 1.1 : 1.0
  const effectiveDelta = delta * speedMult

  result.duration = delta

  // RNG seedé — deterministic based on disconnect timestamp
  const rng = mulberry32(state.lastSaveAt >>> 0)

  // ── Skill progression ──
  for (const skillId of SKILL_IDS) {
    const skillState = state.skills[skillId]
    if (!skillState?.activeAction) continue

    const tickResult = tickSkill(
      skillId,
      skillState,
      state.inventory, // Added
      state.equipment,
      effectiveDelta,
      (rng() * 0xffffffff) >>> 0,
      true
    )

    if (tickResult.actionsCompleted > 0) {
      const xpGained = safeXp(tickResult.xpGained / tickResult.actionsCompleted, tickResult.actionsCompleted)
      result.skills[skillId] = {
        actionsCount: tickResult.actionsCompleted,
        xpGained: xpGained,
        levelsGained: tickResult.levelsGained, // tickSkill may need updating but this is basic
      }
      for (const [itemId, qty] of Object.entries(tickResult.loot)) {
        if (!Number.isFinite(qty) || qty <= 0) continue
        result.loot[itemId] = (result.loot[itemId] ?? 0) + qty
      }
      for (const [itemId, qty] of Object.entries(tickResult.consumed)) {
        if (!Number.isFinite(qty) || qty <= 0) continue
        result.consumed[itemId] = (result.consumed[itemId] ?? 0) + qty
      }
    }
  }

  // ── Combat offline ──
  if (state.combat.active && state.combat.zoneId) {
    const playerStats = computePlayerStats(state)
    const combatResult = simulateCombatsOffline(
      state.combat.zoneId,
      playerStats,
      playerStats.maxHp,
      effectiveDelta,
      rng
    )
    for (const [itemId, qty] of Object.entries(combatResult.loot)) {
      if (!Number.isFinite(qty) || qty <= 0) continue
      result.loot[itemId] = (result.loot[itemId] ?? 0) + qty
    }
    result.goldGained += combatResult.gold
    result.combatSummary = {
      fights: combatResult.fights,
      wins: combatResult.wins,
      deaths: combatResult.deaths,
    }

    if (combatResult.xp > 0) {
      const style = state.combat.trainingStyle ?? "attack";
      const existStyle = result.skills[style] ?? { actionsCount: 0, xpGained: 0, levelsGained: 0 };
      existStyle.actionsCount += combatResult.wins;
      existStyle.xpGained += combatResult.xp;
      result.skills[style] = existStyle;

      const constStyle = result.skills["constitution"] ?? { actionsCount: 0, xpGained: 0, levelsGained: 0 };
      constStyle.actionsCount += combatResult.wins;
      constStyle.xpGained += Math.max(1, Math.floor(combatResult.xp / 3));
      result.skills["constitution"] = constStyle;
    }
  }

  return result
}

export function applyOfflineResult(state: GameState, result: OfflineResult): GameState {
  // Never mutate state directly in a pure application function if we can clone
  const newState = JSON.parse(JSON.stringify(state)) as GameState

  for (const [skillIdStr, skillResult] of Object.entries(result.skills)) {
    const skillId = skillIdStr as SkillId
    const existing = newState.skills[skillId]
    if (existing && skillResult) {
      const newXp = existing.xp + skillResult.xpGained
      newState.skills[skillId] = {
        ...existing,
        xp: newXp,
        level: getLevelForXp(newXp),
      }
    }
  }

  // Consume items
  for (const [itemId, qty] of Object.entries(result.consumed || {})) {
    const current = newState.inventory[itemId] ?? 0
    newState.inventory[itemId] = Math.max(0, current - qty)
  }

  const warnings = applyOfflineLoot(newState, result.loot)
  if (warnings.length > 0 && FLAGS.DEBUG_SHOW_TICK_STATS) {
    console.warn('[Offline] Warnings:', warnings)
  }

  newState.gold += result.goldGained
  newState.lastSaveAt = Date.now()

  return newState
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
  let blockChance = 0;

  let activeStyle: 'attack' | 'strength' | 'ranged' | 'magic' | null = null;

  if (state.equipment.mainhand) {
    let weapon;
    try {
      weapon = GameData.item(state.equipment.mainhand);
    } catch {
      // Invalid item, continue with default
    }
    if (weapon) {
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
    let item;
    try {
      item = GameData.item(itemId);
    } catch {
      continue;
    }
    if (!item?.stats) continue;
    equipmentAttack += item.stats.attack ?? 0;
    equipmentDefense += item.stats.defense ?? 0;
    hpBonus += item.stats.hp ?? 0;
    precision += item.stats.precision ?? 0;
    equipmentHpRegen += item.stats.hpRegen ?? 0;
    if (item.stats.blockChance) {
      blockChance = Math.max(blockChance, item.stats.blockChance);
    }
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

  if (state.upgrades["class_bonus_warrior"]) totalAttack += totalAttack * 0.1;

  return {
    maxHp: 100 + (constitutionLevel * 10) + hpBonus,
    attack: Math.max(1, totalAttack),
    defense: (defenseLevel * 0.7) + equipmentDefense,
    dodgeChance: Math.min(dodgeLevel / 300, 0.25),
    attackSpeed,
    critChance: Math.min(precision / 200, 0.4),
    hpRegen: 2 + (constitutionLevel * 0.1) + equipmentHpRegen,
    prayerBonus: 1.0,
    activeStyle,
    blockChance,
  };
}
