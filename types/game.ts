// ──────────────────────────────────────────────
// Core game types for Idle Realms
// ──────────────────────────────────────────────

export type SkillId =
  | "woodcutting"
  | "mining"
  | "fishing"
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
  hp: number;
  maxHp: number;
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
    | "loot";
  dmg?: number;
  crit?: boolean;
  message?: string;
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
  log: CombatLogEntry[];
}

// ──────────────────────────────────────────────
// Farming
// ──────────────────────────────────────────────
export interface FarmPlot {
  seedId: string | null;
  plantedAt: number | null; // timestamp ms
  readyAt: number | null; // timestamp ms
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

  // Farming (up to 6 plots)
  farmPlots: FarmPlot[];

  // Upgrades
  upgrades: Record<string, number>; // upgradeId → level

  // Zone unlock flags
  unlockedZones: string[];
  unlockedFlags: string[]; // "boat_built", "bridge_repaired", etc.

  // Quest progress
  quests: Record<string, QuestProgress>;
  dailyQuestIds: string[];
  weeklyQuestId: string | null;
  lastDailyReset: number; // timestamp ms
  lastWeeklyReset: number; // timestamp ms

  // Market: track sales for dynamic pricing
  marketSales: Record<string, { count: number; windowStart: number }>;

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
  goldGained: number;
  combatSummary?: {
    fights: number;
    wins: number;
    deaths: number;
  };
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
