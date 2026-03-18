import zonesData from "@/zones_monsters.json";
import { mulberry32, randFloat } from "@/lib/rng";
import {
  DEF_PENETRATION,
  CRIT_MULTIPLIER,
  BLOCK_REDUCTION,
  MAX_CRIT_CHANCE,
  DEATH_REVIVE_HP_PCT,
} from "./constants";
import type { CombatState, CombatLogEntry, MonsterInstance, PlayerStats } from "@/types/game";

// ──────────────────────────────────────────────
// Data types (matching actual zones_monsters.json)
// ──────────────────────────────────────────────

interface MonsterDrop {
  itemId: string;
  chance: number;
  qty: number; // single quantity (not range)
}

interface MonsterDef {
  id: string;
  name: string;
  zone: string;
  stats: { hp: number; attack: number; defense: number; attackSpeed: number };
  combatXp: number;
  goldDrop: { min: number; max: number };
  drops: MonsterDrop[];
}

interface ZoneDef {
  id: string;
  name: string;
  icon?: string;
  reqLevel?: { combat?: number };
  monsters: string[];
  bossId?: string;
  bossChance?: number;
}

const monstersMap = new Map<string, MonsterDef>();
const zonesMap = new Map<string, ZoneDef>();

for (const m of (zonesData as { monsters: MonsterDef[] }).monsters) {
  monstersMap.set(m.id, m);
}
for (const z of (zonesData as { zones: ZoneDef[] }).zones) {
  zonesMap.set(z.id, z);
}

export function getZone(zoneId: string): ZoneDef | undefined {
  return zonesMap.get(zoneId);
}

export function getAllZones(): ZoneDef[] {
  return (zonesData as { zones: ZoneDef[] }).zones;
}

export function spawnMonster(
  zoneId: string,
  rng: () => number
): MonsterInstance | null {
  const zone = zonesMap.get(zoneId);
  if (!zone || zone.monsters.length === 0) return null;

  // Boss chance
  let monsterId: string;
  if (zone.bossId && zone.bossChance && rng() < zone.bossChance) {
    monsterId = zone.bossId;
  } else {
    monsterId = zone.monsters[Math.floor(rng() * zone.monsters.length)];
  }

  const def = monstersMap.get(monsterId);
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    hp: def.stats.hp,
    maxHp: def.stats.hp,
    stats: {
      attack: def.stats.attack,
      defense: def.stats.defense,
      attackSpeed: def.stats.attackSpeed,
    },
  };
}

// ──────────────────────────────────────────────
// Damage formula
// ──────────────────────────────────────────────

export function calcDamage(
  atk: number,
  def: number,
  critChance: number,
  shieldBlockChance: number,
  rng: () => number
): { dmg: number; isCrit: boolean; isBlocked: boolean } {
  // critChance is expected to be a percentage (0 to 1). If it's passed as a raw whole number, scale it down.
  const normalizedCrit = critChance > 1 ? critChance / 100 : critChance;
  const isCrit = rng() < Math.min(normalizedCrit, MAX_CRIT_CHANCE);
  const isBlocked = shieldBlockChance > 0 && rng() < shieldBlockChance;

  let dmg = Math.max(
    1,
    Math.floor((atk - def * DEF_PENETRATION) * randFloat(rng, 0.9, 1.1))
  );
  if (isCrit) dmg = Math.floor(dmg * CRIT_MULTIPLIER);
  if (isBlocked) dmg = Math.floor(dmg * BLOCK_REDUCTION);

  return { dmg, isCrit, isBlocked };
}

// ──────────────────────────────────────────────
// Combat tick
// ──────────────────────────────────────────────

export interface CombatTickResult {
  newCombatState: CombatState;
  newPlayerHp: number;
  loot: Record<string, number>;
  xpGained: number;
  goldGained: number;
}

export function tickCombat(
  state: CombatState,
  playerStats: PlayerStats,
  playerHp: number,
  deltaMs: number,
  rng: () => number
): CombatTickResult {
  const result: CombatTickResult = {
    newCombatState: { ...state },
    newPlayerHp: playerHp,
    loot: {},
    xpGained: 0,
    goldGained: 0,
  };

  if (!state.active || !state.currentMonster || !state.zoneId) {
    return result;
  }

  const newState = { ...state, log: [...state.log] };
  let monster = { ...state.currentMonster };
  let pHp = playerHp;
  let pHitCd = state.playerHitCooldown;
  let mHitCd = state.monsterHitCooldown;
  let remaining = deltaMs;
  const blockChance = playerStats.blockChance;

  while (remaining > 0 && newState.active) {
    const step = Math.min(remaining, pHitCd > 0 ? pHitCd : Infinity, mHitCd > 0 ? mHitCd : Infinity);
    if (!isFinite(step) || step <= 0) break;

    pHitCd -= step;
    mHitCd -= step;
    remaining -= step;

    // Player's turn
    if (pHitCd <= 0) {
      const { dmg, isCrit } = calcDamage(
        playerStats.attack,
        monster.stats.defense,
        playerStats.critChance,
        0,
        rng
      );
      monster = { ...monster, hp: monster.hp - dmg };
      newState.log = [
        ...newState.log.slice(-49),
        { type: "player_hit", dmg, crit: isCrit, timestamp: Date.now() },
      ];
      pHitCd = playerStats.attackSpeed * 1000;
    }

    // Monster's turn
    if (mHitCd <= 0) {
      const { dmg } = calcDamage(
        monster.stats.attack,
        playerStats.defense,
        0,
        blockChance,
        rng
      );
      pHp = Math.max(0, pHp - dmg);
      newState.log = [
        ...newState.log.slice(-49),
        { type: "monster_hit", dmg, timestamp: Date.now() },
      ];
      mHitCd = monster.stats.attackSpeed * 1000;
    }

    // Monster dead
    if (monster.hp <= 0) {
      const monsterDef = monstersMap.get(monster.id);
      if (monsterDef) {
        const drops = rollDrops(monsterDef.drops, rng);
        for (const [itemId, qty] of Object.entries(drops)) {
          result.loot[itemId] = (result.loot[itemId] ?? 0) + qty;
        }
        const gold =
          monsterDef.goldDrop.min +
          Math.floor(rng() * (monsterDef.goldDrop.max - monsterDef.goldDrop.min + 1));
        result.goldGained += gold;
        result.xpGained += monsterDef.combatXp;
      }
      newState.log = [
        ...newState.log.slice(-49),
        { type: "monster_death", timestamp: Date.now() },
      ];

      if (newState.autoRestart && newState.zoneId) {
        const next = spawnMonster(newState.zoneId, rng);
        if (next) {
          monster = next;
          mHitCd = next.stats.attackSpeed * 1000;
        } else {
          newState.active = false;
        }
      } else {
        newState.active = false;
      }
    }

    // Player dead
    if (pHp <= 0) {
      pHp = Math.floor(playerStats.maxHp * DEATH_REVIVE_HP_PCT);
      newState.active = false;
      newState.log = [
        ...newState.log.slice(-49),
        { type: "player_death", timestamp: Date.now() },
      ];
    }
  }

  newState.currentMonster = monster;
  newState.playerHp = pHp;
  newState.playerHitCooldown = pHitCd;
  newState.monsterHitCooldown = mHitCd;
  result.newCombatState = newState;
  result.newPlayerHp = pHp;
  return result;
}

function rollDrops(drops: MonsterDrop[], rng: () => number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const drop of drops) {
    if (rng() < drop.chance) {
      result[drop.itemId] = (result[drop.itemId] ?? 0) + drop.qty;
    }
  }
  return result;
}

// ──────────────────────────────────────────────
// Offline combat simulation
// ──────────────────────────────────────────────

export interface OfflineCombatResult {
  loot: Record<string, number>;
  gold: number;
  fights: number;
  wins: number;
  deaths: number;
}

export function simulateCombatsOffline(
  zoneId: string,
  playerStats: PlayerStats,
  playerMaxHp: number,
  deltaMs: number,
  rng: () => number
): OfflineCombatResult {
  const result: OfflineCombatResult = { loot: {}, gold: 0, fights: 0, wins: 0, deaths: 0 };
  const zone = zonesMap.get(zoneId);
  if (!zone) return result;

  let pHp = playerMaxHp;
  let remaining = deltaMs;
  const avgFightMs = 15_000;

  while (remaining > avgFightMs) {
    const monster = spawnMonster(zoneId, rng);
    if (!monster) break;
    const def = monstersMap.get(monster.id);
    if (!def) break;

    result.fights++;
    remaining -= avgFightMs;

    const playerDps = Math.max(0, (playerStats.attack - monster.stats.defense * DEF_PENETRATION)) / playerStats.attackSpeed;
    const baseMonsterDps = Math.max(0, (monster.stats.attack - playerStats.defense * DEF_PENETRATION)) / monster.stats.attackSpeed;
    const monsterDps = baseMonsterDps * (1 - playerStats.blockChance + playerStats.blockChance * BLOCK_REDUCTION);
    const timeToKill = playerDps > 0 ? (monster.maxHp / playerDps) * 1000 : Infinity;
    const timeToBeKilled = monsterDps > 0 ? (pHp / monsterDps) * 1000 : Infinity;

    if (timeToKill < timeToBeKilled) {
      result.wins++;
      const drops = rollDrops(def.drops, rng);
      for (const [itemId, qty] of Object.entries(drops)) {
        result.loot[itemId] = (result.loot[itemId] ?? 0) + qty;
      }
      result.gold += def.goldDrop.min + Math.floor(rng() * (def.goldDrop.max - def.goldDrop.min + 1));
      // HP taken during fight
      pHp = Math.max(1, pHp - monsterDps * (timeToKill / 1000));
    } else {
      result.deaths++;
      pHp = Math.floor(playerMaxHp * DEATH_REVIVE_HP_PCT);
    }
  }

  return result;
}
