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
import type { ZoneDef } from "@/types/zone";

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
  icon?: string;
  zone: string;
  rarity?: string;
  stats: { hp: number; attack: number; defense: number; attackSpeed: number };
  combatXp: number;
  goldDrop: { min: number; max: number };
  drops: MonsterDrop[];
  description?: string;
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

export interface MonsterData {
  def: MonsterDef;
  isBoss: boolean;
  bossChance?: number;
}

export function getMonstersInZone(zoneId: string): MonsterData[] {
  const zone = zonesMap.get(zoneId);
  if (!zone) return [];

  const monsters: MonsterData[] = zone.monsters
    .map(id => monstersMap.get(id))
    .filter((def): def is MonsterDef => def !== undefined)
    .map(def => ({ def, isBoss: false }));

  if (zone.bossId) {
    const bossDef = monstersMap.get(zone.bossId);
    if (bossDef) {
      monsters.push({ def: bossDef, isBoss: true, bossChance: zone.bossChance });
    }
  }

  return monsters;
}

function makeInstance(def: MonsterDef): MonsterInstance {
  return {
    id: def.id,
    name: def.name,
    icon: def.icon,
    hp: def.stats.hp,
    maxHp: def.stats.hp,
    combatXp: def.combatXp,
    rarity: def.rarity,
    stats: {
      attack: def.stats.attack,
      defense: def.stats.defense,
      attackSpeed: def.stats.attackSpeed,
    },
  };
}

/** Spawn a random regular (non-boss) monster from the pool. */
export function spawnMonsterWithDef(
  monsters: MonsterData[],
  rng: () => number
): { instance: MonsterInstance; def: MonsterDef } | null {
  const regulars = monsters.filter(m => !m.isBoss);
  if (regulars.length === 0) return null;
  const def = regulars[Math.floor(rng() * regulars.length)].def;
  return { instance: makeInstance(def), def };
}

/** Spawn a random regular monster (instance only). */
export function spawnMonster(
  monsters: MonsterData[],
  rng: () => number
): MonsterInstance | null {
  const result = spawnMonsterWithDef(monsters, rng);
  return result ? result.instance : null;
}

/** Explicitly spawn the boss of a zone (for manual challenge). */
export function spawnBossForZone(zoneId: string): MonsterInstance | null {
  const zone = zonesMap.get(zoneId);
  if (!zone?.bossId) return null;
  const bossDef = monstersMap.get(zone.bossId);
  if (!bossDef) return null;
  return makeInstance(bossDef);
}

// ──────────────────────────────────────────────
// Damage formula
// ──────────────────────────────────────────────

export function calcDamage(
  atk: number,
  def: number,
  precision: number,
  shieldBlockChance: number,
  rng: () => number
): { dmg: number; isCrit: boolean; isBlocked: boolean } {
  if (Number.isNaN(atk) || Number.isNaN(def) || Number.isNaN(precision) || Number.isNaN(shieldBlockChance)) {
    return { dmg: 1, isCrit: false, isBlocked: false };
  }

  const isCrit = rng() < Math.min(precision / 200, MAX_CRIT_CHANCE);
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
  monstersKilled: number; // regular kills only (not boss)
  bossKilledId: string | null;  // monster.id when a boss is defeated, else null
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
    monstersKilled: 0,
    bossKilledId: null,
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
      const zone = newState.zoneId ? zonesMap.get(newState.zoneId) : undefined;
      const isBoss = !!zone && zone.bossId === monster.id;

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

      if (!isBoss) result.monstersKilled++;

      newState.log = [
        ...newState.log.slice(-49),
        { type: "monster_death", timestamp: Date.now() },
      ];

      // Boss fight always ends after defeat (no auto-restart)
      if (isBoss) {
        result.bossKilledId = monster.id;
        newState.active = false;
        newState.currentMonster = null;
      } else if (newState.autoRestart && newState.zoneId) {
        const zoneMonsters = getMonstersInZone(newState.zoneId);
        const next = spawnMonster(zoneMonsters, rng);
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
  xp: number;
}

export function simulateCombatsOffline(
  zoneId: string,
  playerStats: PlayerStats,
  playerMaxHp: number,
  deltaMs: number,
  rng: () => number
): OfflineCombatResult {
  const result: OfflineCombatResult = { loot: {}, gold: 0, fights: 0, wins: 0, deaths: 0, xp: 0 };
  const zoneMonsters = getMonstersInZone(zoneId);
  if (zoneMonsters.length === 0) return result;

  let pHp = playerMaxHp;
  let remaining = deltaMs;
  const avgFightMs = 15_000;

  while (remaining > avgFightMs) {
    const spawned = spawnMonsterWithDef(zoneMonsters, rng);
    if (!spawned) break;
    const { instance: monster, def } = spawned;

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
      result.xp += def.combatXp;
      // HP taken during fight
      pHp = Math.max(1, pHp - monsterDps * (timeToKill / 1000));
    } else {
      result.deaths++;
      pHp = Math.floor(playerMaxHp * DEATH_REVIVE_HP_PCT);
    }
  }

  return result;
}
