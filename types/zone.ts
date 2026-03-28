import type { SkillId } from './game'

// ──────────────────────────────────────────────
// Zone lock — heterogeneous, composable
// ──────────────────────────────────────────────

/**
 * Extended skill identifier for zone level locks.
 * 'combat' is a virtual skill derived from all combat skills
 * (see computeCombatLevel in engine/zone-lock.ts).
 */
export type ZoneLevelSkill = SkillId | 'combat'

export type ZoneLock =
  | { type: 'none' }
  | { type: 'level';      skillId: ZoneLevelSkill; required: number }
  | { type: 'craft';      flag: string;            hint: string      }
  | { type: 'boss_kill';  bossId: string;          hint: string      }
  | { type: 'item_found'; itemId: string;          hint: string      }
  | { type: 'AND';        locks: ZoneLock[]                          }

// ──────────────────────────────────────────────
// Zone definition (single canonical type)
// ──────────────────────────────────────────────

export interface ZoneDef {
  id:   string
  name: string
  icon?: string
  description?: string
  lore?: string
  theme?: string
  bgColor?: string

  /**
   * Primary lock for this zone.
   * Absent or null → treated as { type: 'none' } by getEffectiveLock().
   */
  lock?: ZoneLock | null

  /**
   * @deprecated Use `lock` instead.
   * Kept for JSON backwards-compatibility; getEffectiveLock() falls back here.
   */
  reqLevel?:  { combat?: number; mining?: number }
  reqUnlock?: string | null

  monsters:            string[]
  bossId?:             string
  bossChance?:         number
  combatXpMultiplier?: number
  goldMultiplier?:     number
}

// ──────────────────────────────────────────────
// UI progress entry (one row per condition)
// ──────────────────────────────────────────────

export interface ZoneLockProgress {
  label:    string
  current:  number
  required: number
  met:      boolean
  /** Emoji / icon key for the condition row */
  icon:     string
  hint?:    string
}
