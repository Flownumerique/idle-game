/** Maximum offline time to process (ms) */
export const MAX_OFFLINE_MS = 48 * 3600 * 1000; // 48 hours

/** Extended cap with Grimoire upgrade */
export const GRIMOIRE_OFFLINE_MS = 72 * 3600 * 1000; // 72 hours

/** Minimum action duration to prevent speed exploits */
export const MIN_ACTION_DURATION_S = 1.5;

/** Defense penetration coefficient */
export const DEF_PENETRATION = 0.4;

/** Critical hit multiplier */
export const CRIT_MULTIPLIER = 2.0;

/** Block damage reduction */
export const BLOCK_REDUCTION = 0.6; // 40% reduction

/** Maximum crit chance */
export const MAX_CRIT_CHANCE = 0.4;

/** HP percentage on revival after death */
export const DEATH_REVIVE_HP_PCT = 0.3;

/** HP regen delay after combat (ms) */
export const HP_REGEN_DELAY_MS = 3000;

/** Market sell price floor multiplier */
export const MARKET_PRICE_FLOOR = 0.5;

/** Market price decay per 100 sales */
export const MARKET_PRICE_DECAY = 0.02;

/** Market sales window reset (ms) */
export const MARKET_SALES_WINDOW_MS = 30 * 60 * 1000; // 30 min

/** Auto-save interval (ms) */
export const AUTO_SAVE_INTERVAL_MS = 30_000;

/** UI tick interval (ms) */
export const UI_TICK_INTERVAL_MS = 250;

/** Supabase sync interval (ms) */
export const SUPABASE_SYNC_INTERVAL_MS = 5 * 60_000;
