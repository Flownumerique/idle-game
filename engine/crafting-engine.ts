import recipesData from '../recipes.json'
import { getLevelForXp } from '../lib/xp-calc'
import type { SkillId } from '../types/game'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface CraftRecipeDef {
  id:          string
  name:        string
  skill:       string
  reqLevel:    number
  craftTime:   number   // seconds in JSON → converted to ms by duration()
  xpPerCraft:  number
  inputs:      Array<{ itemId: string; qty: number }>
  output:      { itemId: string; qty: number }
}

export interface CraftTickResult {
  /** True when a full craft cycle just completed. */
  completed:          boolean
  producedItems:      Record<string, number>
  consumedItems:      Record<string, number>
  xpGained:          number
  /**
   * True when:
   *  - ingredients are missing mid-cycle (defensive), OR
   *  - the cycle completed but there aren't enough inputs for the NEXT cycle.
   * Either way the loop should be stopped.
   */
  resourcesExhausted: boolean
}

// ──────────────────────────────────────────────
// Module-level recipe index
// ──────────────────────────────────────────────

const recipesById = new Map<string, CraftRecipeDef>()

for (const r of (recipesData as { recipes: Array<Record<string, unknown>> }).recipes) {
  // Only standard recipes (inputs + output + craftTime, no special type)
  if (
    r.inputs && r.output && r.craftTime != null &&
    r.skill && (!r.type || r.type === 'standard')
  ) {
    recipesById.set(r.id as string, r as unknown as CraftRecipeDef)
  }
}

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

export function getCraftRecipe(id: string): CraftRecipeDef | undefined {
  return recipesById.get(id)
}

/**
 * Returns all craft recipes for a given skill whose reqLevel ≤ current level.
 */
export function getCraftRecipesForSkill(
  skillId: string,
  skillXp: number,
): CraftRecipeDef[] {
  const level = getLevelForXp(skillXp)
  return Array.from(recipesById.values()).filter(
    r => r.skill === skillId && (r.reqLevel ?? 1) <= level,
  )
}

/**
 * Returns true when the inventory holds enough of each ingredient.
 * Used internally by tickCraft (skill already verified at craft start).
 */
export function canAffordRecipe(
  recipe: CraftRecipeDef,
  inventory: Record<string, number>,
): boolean {
  return recipe.inputs.every(
    input => (inventory[input.itemId] ?? 0) >= input.qty,
  )
}

/**
 * Single source of truth for craft availability.
 * Checks both ingredient quantities AND skill level requirement.
 * Logs missing ingredients at debug level (dev only).
 */
export function canCraft(
  recipeId: string,
  inventory: Record<string, number>,
  skills: Partial<Record<SkillId, { xp: number }>>,
): boolean {
  const recipe = recipesById.get(recipeId)
  if (!recipe) return false

  const skillLevel = getLevelForXp(skills[recipe.skill as SkillId]?.xp ?? 0)
  if (skillLevel < (recipe.reqLevel ?? 1)) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`CRAFT_FAIL: skill ${recipe.skill} need ${recipe.reqLevel} have ${skillLevel}`)
    }
    return false
  }

  for (const input of recipe.inputs) {
    const have = inventory[input.itemId] ?? 0
    if (have < input.qty) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`CRAFT_FAIL: ${input.itemId} need ${input.qty} have ${have}`)
      }
      return false
    }
  }

  return true
}

// ──────────────────────────────────────────────
// Delta-time tick
// ──────────────────────────────────────────────

/**
 * Pure tick function called every game-loop frame.
 *
 * Behaviour:
 *  - Returns `completed: false` while the craft is still in progress.
 *  - When `elapsed >= duration`:
 *    1. Verifies ingredients are still present (defensive).
 *    2. If not: returns resourcesExhausted = true, completed = false.
 *    3. If yes: computes consumed/produced, checks whether ingredients
 *       exist for the NEXT cycle, returns completed = true.
 *       • `resourcesExhausted = true`  → caller should stop the loop.
 *       • `resourcesExhausted = false` → caller should reset startedAt = now.
 */
export function tickCraft(
  startedAt: number,
  durationMs: number,
  recipeId: string,
  inventory: Record<string, number>,
  now: number,
): CraftTickResult {
  const elapsed = now - startedAt

  if (elapsed < durationMs) {
    // Still in progress — nothing to do yet
    return {
      completed: false,
      producedItems: {},
      consumedItems: {},
      xpGained: 0,
      resourcesExhausted: false,
    }
  }

  const recipe = recipesById.get(recipeId)
  if (!recipe) {
    return {
      completed: false,
      producedItems: {},
      consumedItems: {},
      xpGained: 0,
      resourcesExhausted: true,
    }
  }

  // Defensive: verify ingredients are still available for THIS cycle
  if (!canAffordRecipe(recipe, inventory)) {
    return {
      completed: false,
      producedItems: {},
      consumedItems: {},
      xpGained: 0,
      resourcesExhausted: true,
    }
  }

  // Build consume / produce maps
  const consumedItems: Record<string, number> = {}
  for (const input of recipe.inputs) {
    consumedItems[input.itemId] = input.qty
  }
  const producedItems: Record<string, number> = {
    [recipe.output.itemId]: recipe.output.qty,
  }

  // Simulate inventory after consuming THIS cycle to check if NEXT cycle is feasible
  const inventoryAfterConsume = { ...inventory }
  for (const [itemId, qty] of Object.entries(consumedItems)) {
    inventoryAfterConsume[itemId] = (inventoryAfterConsume[itemId] ?? 0) - qty
  }
  const resourcesExhausted = !canAffordRecipe(recipe, inventoryAfterConsume)

  return {
    completed: true,
    producedItems,
    consumedItems,
    xpGained: recipe.xpPerCraft,
    resourcesExhausted,
  }
}

/**
 * Duration in milliseconds for a recipe (craftTime JSON field is in seconds).
 */
export function craftDurationMs(recipe: CraftRecipeDef): number {
  return (recipe.craftTime ?? 3) * 1000
}
