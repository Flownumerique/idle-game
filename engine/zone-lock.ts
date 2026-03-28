import type { GameState, SkillId } from '../types/game'
import type { ZoneDef, ZoneLock, ZoneLevelSkill, ZoneLockProgress } from '../types/zone'
import { getLevelForXp } from '../lib/xp-calc'

// ──────────────────────────────────────────────
// Combat level formula (centralised here so
// CombatPanel + ZoneCard both import it)
// ──────────────────────────────────────────────

export function computeCombatLevel(state: GameState): number {
  const lv = (id: SkillId) => getLevelForXp(state.skills[id]?.xp ?? 0)
  return Math.floor(
    ((lv('defense') + lv('constitution') + Math.floor(lv('prayer') / 2)) * 0.25) +
    Math.max(
      lv('attack')  + lv('strength'),
      lv('magic')   * 1.5,
      lv('ranged')  * 1.5,
    ) * 0.325,
  )
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function resolveLevel(skillId: ZoneLevelSkill, state: GameState): number {
  if (skillId === 'combat') return computeCombatLevel(state)
  return getLevelForXp(state.skills[skillId as SkillId]?.xp ?? 0)
}

function skillLabel(skillId: ZoneLevelSkill): string {
  if (skillId === 'combat') return 'Niveau de combat'
  return `Niveau ${skillId}`
}

// ──────────────────────────────────────────────
// Core evaluator — pure, no side-effects
// ──────────────────────────────────────────────

/**
 * Returns true when all conditions of `lock` are satisfied for
 * the current `state`. AND is recursive; short-circuits on failure.
 *
 * Convention for persistent conditions:
 *  - craft    → GameState.unlockedFlags includes lock.flag
 *  - boss_kill→ GameState.unlockedFlags includes `boss_killed_${bossId}`
 *               (set by combat engine on boss death)
 *  - item_found→ GameState.discoveredItems includes lock.itemId
 */
export function evaluateZoneLock(lock: ZoneLock, state: GameState): boolean {
  switch (lock.type) {
    case 'none':
      return true

    case 'level':
      return resolveLevel(lock.skillId, state) >= lock.required

    case 'craft':
      return state.unlockedFlags.includes(lock.flag)

    case 'boss_kill':
      return state.unlockedFlags.includes(`boss_killed_${lock.bossId}`)

    case 'item_found':
      return state.discoveredItems.includes(lock.itemId)

    case 'AND':
      return lock.locks.every(l => evaluateZoneLock(l, state))
  }
}

// ──────────────────────────────────────────────
// Legacy compatibility
// ──────────────────────────────────────────────

/**
 * Returns the effective ZoneLock for a zone, falling back to the
 * deprecated `reqLevel` / `reqUnlock` fields when `lock` is absent.
 * New zones should set `lock` explicitly; old zones continue to work.
 */
export function getEffectiveLock(zone: ZoneDef): ZoneLock {
  if (zone.lock != null) return zone.lock

  // Build a combined legacy AND lock
  const parts: ZoneLock[] = []

  const combatReq = zone.reqLevel?.combat
  if (combatReq != null && combatReq > 1) {
    parts.push({ type: 'level', skillId: 'combat', required: combatReq })
  }

  const miningReq = zone.reqLevel?.mining
  if (miningReq != null && miningReq > 0) {
    parts.push({ type: 'level', skillId: 'mining', required: miningReq })
  }

  if (zone.reqUnlock) {
    parts.push({ type: 'craft', flag: zone.reqUnlock, hint: `Débloquez : ${zone.reqUnlock}` })
  }

  if (parts.length === 0) return { type: 'none' }
  if (parts.length === 1) return parts[0]
  return { type: 'AND', locks: parts }
}

// ──────────────────────────────────────────────
// UI progress data
// ──────────────────────────────────────────────

/**
 * Returns one ZoneLockProgress entry per leaf condition, suitable for
 * rendering per-row progress in the ZoneCard lock section.
 * AND locks are flattened (recursively).
 */
export function getZoneLockProgress(
  lock: ZoneLock,
  state: GameState,
): ZoneLockProgress[] {
  switch (lock.type) {
    case 'none':
      return []

    case 'level': {
      const current = resolveLevel(lock.skillId, state)
      return [{
        label:    skillLabel(lock.skillId),
        current,
        required: lock.required,
        met:      current >= lock.required,
        icon:     '🔵',
      }]
    }

    case 'craft': {
      const met = state.unlockedFlags.includes(lock.flag)
      return [{
        label:    lock.hint,
        current:  met ? 1 : 0,
        required: 1,
        met,
        icon:     '🟠',
        hint:     lock.hint,
      }]
    }

    case 'boss_kill': {
      const met = state.unlockedFlags.includes(`boss_killed_${lock.bossId}`)
      return [{
        label:    lock.hint,
        current:  met ? 1 : 0,
        required: 1,
        met,
        icon:     '💀',
        hint:     lock.hint,
      }]
    }

    case 'item_found': {
      const met = state.discoveredItems.includes(lock.itemId)
      return [{
        label:    lock.hint,
        current:  met ? 1 : 0,
        required: 1,
        met,
        icon:     '❓',
        hint:     lock.hint,
      }]
    }

    case 'AND':
      return lock.locks.flatMap(l => getZoneLockProgress(l, state))
  }
}
