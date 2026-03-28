import type { GameState } from '../types/game'
import type { UnlockCondition, UnlockEvent } from '../types/unlock'
import { unlockFlagKey } from '../types/unlock'
import rawSkills  from '../skills.json'
import rawRecipes from '../recipes.json'

// ──────────────────────────────────────────────
// Core evaluator
// ──────────────────────────────────────────────

/**
 * Recursively evaluates an UnlockCondition against the current game state.
 * Pure function — no side effects.
 */
export function evaluateCondition(
  condition: UnlockCondition,
  state: GameState,
): boolean {
  switch (condition.type) {
    case 'resource':
      return (state.inventory[condition.resourceId] ?? 0) >= condition.amount

    case 'skillLevel':
      return (state.skills[condition.skillId]?.level ?? 0) >= condition.level

    case 'craftFlag':
      return state.unlockedFlags.includes(condition.flag)

    case 'AND':
      return condition.conditions.every(c => evaluateCondition(c, state))

    case 'OR':
      return condition.conditions.some(c => evaluateCondition(c, state))
  }
}

// ──────────────────────────────────────────────
// Bulk unlock scanner
// ──────────────────────────────────────────────

/**
 * Scans all skills, actions, and recipes for pending unlocks.
 * Returns only items whose condition is now met AND that are not yet unlocked.
 * Call this after any state-mutating event (resource gain, level-up, kill, etc.)
 */
export function checkAllUnlocks(state: GameState): UnlockEvent[] {
  const result: UnlockEvent[] = []
  const flags = new Set(state.unlockedFlags)

  // Skills
  for (const skill of rawSkills.skills) {
    const cond = (skill as any).unlockCondition as UnlockCondition | null | undefined
    if (!cond) continue
    if (flags.has(unlockFlagKey('skill', skill.id))) continue
    if (evaluateCondition(cond, state)) {
      result.push({ kind: 'skill', id: skill.id, name: skill.name })
    }
  }

  // Actions (nested inside each skill)
  for (const skill of rawSkills.skills) {
    for (const action of (skill.actions ?? [])) {
      const cond = (action as any).unlockCondition as UnlockCondition | null | undefined
      if (!cond) continue
      if (flags.has(unlockFlagKey('action', action.id))) continue
      if (evaluateCondition(cond, state)) {
        result.push({
          kind:    'action',
          id:      action.id,
          skillId: skill.id,
          name:    action.name,
        })
      }
    }
  }

  // Recipes
  for (const recipe of rawRecipes.recipes) {
    const cond = (recipe as any).unlockCondition as UnlockCondition | null | undefined
    if (!cond) continue
    if (flags.has(unlockFlagKey('recipe', recipe.id))) continue
    if (evaluateCondition(cond, state)) {
      result.push({ kind: 'recipe', id: recipe.id, name: recipe.name })
    }
  }

  return result
}

// ──────────────────────────────────────────────
// UI helper — human-readable condition string
// e.g. "Niveau Mining 10 + 20x ore_iron"
// ──────────────────────────────────────────────

export function describeCondition(condition: UnlockCondition): string {
  switch (condition.type) {
    case 'resource':
      return `${condition.amount}x ${condition.resourceId}`

    case 'skillLevel':
      return `Niveau ${condition.skillId} ${condition.level}`

    case 'craftFlag':
      return condition.flag

    case 'AND':
      return condition.conditions.map(describeCondition).join(' + ')

    case 'OR':
      return condition.conditions.map(describeCondition).join(' ou ')
  }
}
