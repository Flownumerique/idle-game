import type { GameState, SkillId } from '../types/game'
import type { ZoneLock } from '../types/zone'
import type { UnlockCondition } from '../types/unlock'
import { CLASS_SYNERGIES, synergySynergyFlagKey } from '../types/class-synergy'
import { synergyDiscoveredFlag } from '../types/recipe'
import { unlockFlagKey } from '../types/unlock'
import { computeCombatLevel } from './zone-lock'
import { evaluateZoneLock, getEffectiveLock } from './zone-lock'
import { getLevelForXp } from '../lib/xp-calc'
import rawZones   from '../zones_monsters.json'
import rawSkills  from '../skills.json'
import rawRecipes from '../recipes.json'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type GoalKind = 'zone' | 'synergy' | 'recipe' | 'skill'

/** One leaf condition to display as a mini progress row */
export interface GoalCondition {
  label:    string
  icon:     string
  current:  number
  required: number
}

/** A single goal card to render */
export interface GoalEntry {
  id:              string
  kind:            GoalKind
  name:            string
  icon:            string
  score:           number   // 0.0 – <1.0  (avg progress across all conditions)
  conditions:      GoalCondition[]
  navigateTo:      string   // tab id
  navigateSection?: string  // sub-section id (e.g. 'synergies')
}

// ──────────────────────────────────────────────
// Skill icon map (best-effort)
// ──────────────────────────────────────────────

const SKILL_ICONS: Record<string, string> = {
  attack: '⚔️', strength: '💪', ranged: '🏹', magic: '✨',
  defense: '🛡️', dodge: '💨', constitution: '❤️', prayer: '🙏',
  woodcutting: '🪓', mining: '⛏️', fishing: '🎣', cooking: '🍳',
  smithing: '🔨', alchemy: '⚗️', farming: '🌾', planting: '🌱',
  combat: '⚔️',
}

function skillIcon(skillId: string): string {
  return SKILL_ICONS[skillId] ?? '📊'
}

// ──────────────────────────────────────────────
// Scoring helpers
// ──────────────────────────────────────────────

function avgScore(conditions: GoalCondition[]): number {
  if (conditions.length === 0) return 0
  return conditions.reduce((s, c) => s + Math.min(c.current / c.required, 1), 0) / conditions.length
}

// ── Zone lock → conditions ─────────────────────

function lockToConditions(lock: ZoneLock, state: GameState): GoalCondition[] {
  switch (lock.type) {
    case 'none':
      return []

    case 'level': {
      const current = lock.skillId === 'combat'
        ? computeCombatLevel(state)
        : getLevelForXp(state.skills[lock.skillId as SkillId]?.xp ?? 0)
      const label = lock.skillId === 'combat' ? 'Combat' : lock.skillId
      return [{ label, icon: skillIcon(lock.skillId), current, required: lock.required }]
    }

    case 'craft': {
      const met = state.unlockedFlags.includes(lock.flag) ? 1 : 0
      return [{ label: lock.hint, icon: '🔨', current: met, required: 1 }]
    }

    case 'boss_kill': {
      const met = state.unlockedFlags.includes(`boss_killed_${lock.bossId}`) ? 1 : 0
      return [{ label: lock.hint, icon: '💀', current: met, required: 1 }]
    }

    case 'item_found': {
      const met = state.discoveredItems.includes(lock.itemId) ? 1 : 0
      return [{ label: lock.hint, icon: '🗺️', current: met, required: 1 }]
    }

    case 'AND':
      return lock.locks.flatMap(l => lockToConditions(l, state))
  }
}

// ── UnlockCondition → conditions ──────────────

function unlockConditionToGoalConditions(
  cond: UnlockCondition,
  state: GameState,
): GoalCondition[] {
  switch (cond.type) {
    case 'skillLevel': {
      const current = getLevelForXp(state.skills[cond.skillId]?.xp ?? 0)
      return [{ label: cond.skillId, icon: skillIcon(cond.skillId), current, required: cond.level }]
    }

    case 'resource': {
      const current = Math.min(state.inventory[cond.resourceId] ?? 0, cond.amount)
      return [{ label: cond.resourceId, icon: '📦', current, required: cond.amount }]
    }

    case 'craftFlag': {
      const met = state.unlockedFlags.includes(cond.flag) ? 1 : 0
      return [{ label: cond.flag, icon: '🔨', current: met, required: 1 }]
    }

    case 'AND':
      return cond.conditions.flatMap(c => unlockConditionToGoalConditions(c, state))

    case 'OR': {
      // Show the best-progress sub-condition only
      const subs = cond.conditions.map(c => unlockConditionToGoalConditions(c, state))
      const bestIdx = subs.reduce(
        (best, cur, i) => (avgScore(cur) > avgScore(subs[best]) ? i : best),
        0,
      )
      return subs[bestIdx]
    }
  }
}

// ──────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────

/**
 * Scans all lockable content (zones, class synergies, synergy recipes,
 * skill/action unlocks) and returns the 3 entries closest to being
 * unlocked (highest average condition progress that is still < 1.0).
 *
 * Pure function — safe to call every render tick.
 */
export function computeActiveGoals(state: GameState): GoalEntry[] {
  const goals: GoalEntry[] = []

  // ── 1. Zones ──────────────────────────────────────────────────────────────
  for (const zone of (rawZones as { zones: Array<{ id: string; name: string; icon?: string; lock?: ZoneLock | null; reqLevel?: { combat?: number; mining?: number }; reqUnlock?: string | null }> }).zones) {
    const lock = getEffectiveLock(zone as Parameters<typeof getEffectiveLock>[0])
    if (lock.type === 'none') continue
    if (evaluateZoneLock(lock, state)) continue

    const conditions = lockToConditions(lock, state)
    if (conditions.length === 0) continue
    const score = avgScore(conditions)
    if (score >= 1) continue

    goals.push({
      id:          `zone_${zone.id}`,
      kind:        'zone',
      name:        zone.name,
      icon:        zone.icon ?? '🌍',
      score,
      conditions,
      navigateTo:  'combat',
    })
  }

  // ── 2. Class synergies ────────────────────────────────────────────────────
  for (const synergy of CLASS_SYNERGIES) {
    if (state.unlockedFlags.includes(synergySynergyFlagKey(synergy.id))) continue

    const conditions = unlockConditionToGoalConditions(synergy.condition, state)
    if (conditions.length === 0) continue
    const score = avgScore(conditions)
    if (score >= 1) continue

    goals.push({
      id:              `synergy_${synergy.id}`,
      kind:            'synergy',
      name:            synergy.name,
      icon:            synergy.classId === 'warrior' ? '⚔️' : synergy.classId === 'forester' ? '🌿' : '✨',
      score,
      conditions,
      navigateTo:      'character',
      navigateSection: 'synergies',
    })
  }

  // ── 3. Synergy recipes ────────────────────────────────────────────────────
  for (const recipe of (rawRecipes as { recipes: Array<{ id: string; type?: string; name: string; ingredients?: Array<{ itemId: string; amount: number }>; requiredSkill?: { skillId: string; level: number } }> }).recipes) {
    if (recipe.type !== 'synergy') continue
    if (state.unlockedFlags.includes(synergyDiscoveredFlag(recipe.id))) continue

    const conditions: GoalCondition[] = [
      ...(recipe.ingredients ?? []).map(ing => ({
        label:    ing.itemId,
        icon:     '📦',
        current:  Math.min(state.inventory[ing.itemId] ?? 0, ing.amount),
        required: ing.amount,
      })),
    ]
    if (recipe.requiredSkill) {
      conditions.push({
        label:    recipe.requiredSkill.skillId,
        icon:     skillIcon(recipe.requiredSkill.skillId),
        current:  getLevelForXp(state.skills[recipe.requiredSkill.skillId as SkillId]?.xp ?? 0),
        required: recipe.requiredSkill.level,
      })
    }
    if (conditions.length === 0) continue
    const score = avgScore(conditions)
    if (score >= 1) continue

    goals.push({
      id:         `recipe_${recipe.id}`,
      kind:       'recipe',
      name:       recipe.name,
      icon:       '⚗️',
      score,
      conditions,
      navigateTo: 'skills',
    })
  }

  // ── 4. Skill / action unlocks (skills.json unlockCondition) ──────────────
  for (const skill of (rawSkills as { skills: Array<{ id: string; name: string; icon?: string; unlockCondition?: UnlockCondition; actions?: Array<{ id: string; name: string; unlockCondition?: UnlockCondition }> }> }).skills) {
    if (skill.unlockCondition) {
      const flag = unlockFlagKey('skill', skill.id)
      if (!state.unlockedFlags.includes(flag)) {
        const conditions = unlockConditionToGoalConditions(skill.unlockCondition, state)
        const score = avgScore(conditions)
        if (conditions.length > 0 && score < 1) {
          goals.push({
            id:         `skill_${skill.id}`,
            kind:       'skill',
            name:       skill.name,
            icon:       skill.icon ?? '📚',
            score,
            conditions,
            navigateTo: 'skills',
          })
        }
      }
    }

    for (const action of (skill.actions ?? [])) {
      if (!action.unlockCondition) continue
      const flag = unlockFlagKey('action', action.id)
      if (state.unlockedFlags.includes(flag)) continue
      const conditions = unlockConditionToGoalConditions(action.unlockCondition, state)
      const score = avgScore(conditions)
      if (conditions.length > 0 && score < 1) {
        goals.push({
          id:         `action_${action.id}`,
          kind:       'skill',
          name:       action.name,
          icon:       skillIcon(skill.id),
          score,
          conditions,
          navigateTo: 'skills',
        })
      }
    }
  }

  // Sort descending by score (closest to unlock first) and keep top 3
  return goals.sort((a, b) => b.score - a.score).slice(0, 3)
}
