// ──────────────────────────────────────────────
// Core game types for Idle Realms
// ──────────────────────────────────────────────

export type SkillId =
  | "woodcutting"
  | "mining"
  | "fishing"
  | "planting"
  | "farming"
  | "smithing"
  | "cooking"
  | "alchemy"
  | "attack"
  | "strength"
  | "ranged"
  | "magic"
  | "defense"
  | "dodge"
  | "constitution"
  | "prayer";

export const SKILL_IDS = [
  "woodcutting",
  "mining",
  "fishing",
  "planting",
  "farming",
  "smithing",
  "cooking",
  "alchemy",
  "attack",
  "strength",
  "ranged",
  "magic",
  "defense",
  "dodge",
  "constitution",
  "prayer",
] as const satisfies SkillId[];

export const PROFESSION_SKILL_IDS = [
  "woodcutting",
  "mining",
  "fishing",
  "planting",
  "farming",
  "smithing",
  "cooking",
  "alchemy",
] as const satisfies SkillId[];

export const COMBAT_SKILL_IDS = [
  "attack",
  "strength",
  "ranged",
  "magic",
  "defense",
  "dodge",
  "constitution",
  "prayer",
] as const satisfies SkillId[];

export type SlotId =
  | "head"
  | "chest"
  | "legs"
  | "hands"
  | "feet"
  | "mainhand"
  | "offhand"
  | "neck"
  | "ring1"
  | "ring2"
  | "cape"
  | "tool_woodcutting"
  | "tool_mining"
  | "tool_fishing";

export type PlayerClass = "warrior" | "forester" | "mage";
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemCategory =
  | "resource"
  | "equipment"
  | "consumable"
  | "material"
  | "seed"
  | "currency";
export type QuestStatus = "locked" | "available" | "active" | "completed";
export type QuestType =
  | "main"
  | "skill"
  | "daily"
  | "weekly"
  | "urgency"
  | "achievement";

// ──────────────────────────────────────────────
// Skill state
// ──────────────────────────────────────────────
export interface SkillState {
  level: number; // 1–99 (120 mastery)
  xp: number; // total accumulated XP
  activeAction: string | null; // action id from skills.json
  actionStartedAt: number | null; // timestamp ms
  actionProgress: number; // 0.0–1.0, UI only
}

// ──────────────────────────────────────────────
// Combat
// ──────────────────────────────────────────────
export interface MonsterInstance {
  id: string;
  name: string;
  icon?: string;
  hp: number;
  maxHp: number;
  combatXp: number;
  rarity?: string;
  stats: {
    attack: number;
    defense: number;
    attackSpeed: number; // seconds between hits
  };
}

export interface CombatLogEntry {
  type:
    | "player_hit"
    | "monster_hit"
    | "player_death"
    | "monster_death"
    | "combat_xp"
    | "loot";
  dmg?: number;
  crit?: boolean;
  message?: string;
  monsterName?: string;
  xpGains?: Array<{ skillId: SkillId; amount: number }>;
  timestamp: number;
}

export interface CombatState {
  active: boolean;
  zoneId: string | null;
  currentMonster: MonsterInstance | null;
  playerHp: number;
  playerHitCooldown: number; // ms remaining
  monsterHitCooldown: number; // ms remaining
  autoRestart: boolean;
  trainingStyle: SkillId;
  log: CombatLogEntry[];
}

// ──────────────────────────────────────────────
// Planting (parcelles)
// ──────────────────────────────────────────────
export interface PlantPlot {
  seedId: string | null;
  plantedAt: number | null; // timestamp ms
  readyAt: number | null; // timestamp ms
}

// ──────────────────────────────────────────────
// Farming (récolte d'herbes)
// ──────────────────────────────────────────────
export interface FarmingSpot {
  id: string;
  herbId: string | null;
  lastGatheredAt: number | null; // timestamp ms
  respawnAt: number | null; // timestamp ms
}

// ──────────────────────────────────────────────
// Quest objective tracking
// ──────────────────────────────────────────────
export interface QuestObjective {
  id: string;
  type: string;
  target: string;
  required: number;
  current: number;
}

export interface QuestProgress {
  questId: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  completedAt?: number;
}

// ──────────────────────────────────────────────
// Full player game state (persisted)
// ──────────────────────────────────────────────
export interface GameState {
  // Class synergy runtime state (stacks, timestamps, timed bonuses)
  synergyState: Record<string, number>;
  // Identity
  player: {
    id: string;
    name: string;
    playerClass: PlayerClass;
    createdAt: number;
  };

  // Skills
  skills: Record<SkillId, SkillState>;

  // Inventory & equipment
  inventory: Record<string, number>; // itemId → quantity
  equipment: Record<SlotId, string | null>; // slotId → itemId | null
  inventoryMax: number;

  // Gold
  gold: number;

  // Combat
  combat: CombatState;

  // Game logs
  gameLogs: GameLogEntry[];

  // Planting (up to 6 plots)
  plantPlots: PlantPlot[];

  // Farming (herb gathering spots)
  farmingSpots: FarmingSpot[];

  // Upgrades
  upgrades: Record<string, number>; // upgradeId → level

  // Zone unlock flags
  unlockedZones: string[];
  unlockedFlags: string[]; // "boat_built", "bridge_repaired", etc.

  // Kill counters per zone (used to unlock boss)
  zoneKills: Record<string, number>;

  // Quest progress
  quests: Record<string, QuestProgress>;
  dailyQuestIds: string[];
  weeklyQuestId: string | null;
  lastDailyReset: number; // timestamp ms
  lastWeeklyReset: number; // timestamp ms

  // Market: track sales for dynamic pricing
  marketSales: Record<string, { count: number; windowStart: number }>;

  // Active craft session (null when idle)
  activeCraft: ActiveCraft | null;

  // Active timed buffs from consumables
  activeBuffs: ActiveBuff[];

  // Consumable hotbar slots (2 slots for quick-use potions/food)
  consumableSlots: [string | null, string | null];

  // Encyclopedia
  discoveredItems: string[];

  // Meta
  lastSaveAt: number; // timestamp ms
  totalPlayTime: number; // ms
  version: number; // save version for migrations
}

// ──────────────────────────────────────────────
// Offline progress result
// ──────────────────────────────────────────────
export interface OfflineSkillResult {
  actionsCount: number;
  xpGained: number;
  levelsGained: number;
}

export interface OfflineResult {
  duration: number; // ms actually processed (capped)
  skills: Partial<Record<SkillId, OfflineSkillResult>>;
  loot: Record<string, number>;
  consumed: Record<string, number>;
  goldGained: number;
  combatSummary?: {
    fights: number;
    wins: number;
    deaths: number;
  };
}

// ──────────────────────────────────────────────
// Active craft session (persisted)
// ──────────────────────────────────────────────
export interface ActiveCraft {
  skillId:        string
  recipeId:       string
  startedAt:      number   // timestamp ms
  duration:       number   // ms (craftTime * 1000)
  completedCount: number
}

// ──────────────────────────────────────────────
// Consumable buffs (timed)
// ──────────────────────────────────────────────
export interface ActiveBuff {
  id:                string   // itemId + '_' + timestamp
  itemId:            string
  attackBonus:       number
  defenseBonus:      number
  hpRegenBonus:      number
  xpMultiplier:      number   // 1.0 = no bonus; 1.5 = +50% XP
  harvestMultiplier: number   // 1.0 = no bonus; 1.3 = +30% yield
  expiresAt:         number   // timestamp ms
}

// ──────────────────────────────────────────────
// Player computed stats (derived, not stored)
// ──────────────────────────────────────────────
export interface PlayerStats {
  maxHp: number;
  attack: number;
  defense: number;
  dodgeChance: number;
  attackSpeed: number; // seconds
  critChance: number; // 0.0–0.40
  hpRegen: number; // HP/s
  prayerBonus: number;
  activeStyle: 'attack' | 'strength' | 'ranged' | 'magic' | null;
  blockChance: number;
  furyDamageMultiplier: number; // 1.0 baseline; warrior synergy stacks add to it
  magicXpMultiplier: number;    // 1.0 baseline; mage synergy potion bonus
  xpMultiplier:      number;    // 1.0 baseline; food/scroll buffs
  harvestMultiplier: number;    // 1.0 baseline; food buffs for gathering yield
}

export interface ItemDrop {
  itemId: string;
  qty: number;
}

export interface QuestReward {
  gold?: number;
  xp?: Record<SkillId, number>;
  items?: ItemDrop[];
}

// ──────────────────────────────────────────────
// Equipment types
// ──────────────────────────────────────────────
export interface EquipmentStats {
  attack?: number;
  defense?: number;
  hp?: number;
  hpRegen?: number;
  attackSpeed?: number;
  precision?: number;
  magicAttack?: number;
  blockChance?: number;
  actionSpeedBonus?: number;
  rareDropBonus?: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: "equipment";
  rarity: ItemRarity;
  icon: string;
  slot: SlotId;
  stats: EquipmentStats;
  requirements?: {
    level?: number;
    skill?: SkillId;
    skillLevel?: number;
    class?: PlayerClass;
  };
  description?: string;
}

export interface GameLogEntry {
  type:
    | "player_hit"
    | "monster_hit"
    | "player_death"
    | "monster_death"
    | "loot"
    | "equipment_equipped"
    | "equipment_unequipped"
    | "item_crafted"
    | "skill_level"
    | "achievement"
    | "quest";
  dmg?: number;
  crit?: boolean;
  itemId?: string;
  slot?: SlotId;
  message?: string;
  timestamp: number;
}

export interface OfflineSummary {
  duration: number; // ms actually processed (capped)
  skills: Partial<Record<SkillId, OfflineSkillResult>>;
  loot: Record<string, number>;
  goldGained: number;
  combatSummary?: {
    fights: number;
    wins: number;
    deaths: number;
  };
}
