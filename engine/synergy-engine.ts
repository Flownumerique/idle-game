import rawRecipes from '../recipes.json'
import type { SynergyRecipe } from '../types/recipe'
import { isSynergyRecipe, synergyDiscoveredFlag } from '../types/recipe'
import type { GameState, SkillId } from '../types/game'
import { getLevelForXp } from '../lib/xp-calc'
import { bus } from './event-bus'

// ──────────────────────────────────────────────
// Module-level data (loaded once)
// ──────────────────────────────────────────────

const allSynergies: SynergyRecipe[] = (rawRecipes.recipes as unknown[])
  .filter(isSynergyRecipe)

const synergiesById = new Map<string, SynergyRecipe>(
  allSynergies.map(r => [r.id, r]),
)

// Pre-computed index: itemId → set of synergy recipe IDs that use it
const ingredientIndex = new Map<string, Set<string>>()
for (const recipe of allSynergies) {
  for (const ing of recipe.ingredients) {
    if (!ingredientIndex.has(ing.itemId)) {
      ingredientIndex.set(ing.itemId, new Set())
    }
    ingredientIndex.get(ing.itemId)!.add(recipe.id)
  }
}

// ──────────────────────────────────────────────
// Pure queries
// ──────────────────────────────────────────────

export function getAllSynergies(): SynergyRecipe[] {
  return allSynergies
}

export function getSynergyRecipe(id: string): SynergyRecipe | undefined {
  return synergiesById.get(id)
}

/**
 * True when itemId is used in at least one synergy recipe.
 * O(1) — uses pre-computed index.
 */
export function isIngredientInAnySynergy(itemId: string): boolean {
  return ingredientIndex.has(itemId)
}

/**
 * Returns all synergy recipes that list itemId as an ingredient,
 * each decorated with its current discovery state.
 */
export function getSynergiesForItem(
  itemId: string,
  state: Pick<GameState, 'unlockedFlags'>,
): Array<{ recipe: SynergyRecipe; isDiscovered: boolean }> {
  const ids = ingredientIndex.get(itemId)
  if (!ids) return []

  return [...ids]
    .map(id => synergiesById.get(id)!)
    .map(recipe => ({
      recipe,
      isDiscovered: state.unlockedFlags.includes(synergyDiscoveredFlag(recipe.id)),
    }))
}

// ──────────────────────────────────────────────
// Discovery check — pure, no side-effects
// ──────────────────────────────────────────────

/**
 * Returns IDs of synergy recipes that are newly discoverable:
 *   - not yet in unlockedFlags
 *   - player owns ≥1 of EVERY ingredient
 *   - player meets the required skill level
 *
 * Caller is responsible for persisting and notifying.
 */
export function checkSynergyDiscovery(
  state: Pick<GameState, 'inventory' | 'skills' | 'unlockedFlags'>,
): string[] {
  const result: string[] = []

  for (const recipe of allSynergies) {
    if (state.unlockedFlags.includes(synergyDiscoveredFlag(recipe.id))) continue

    const hasIngredients = recipe.ingredients.every(
      ing => (state.inventory[ing.itemId] ?? 0) >= 1,
    )
    if (!hasIngredients) continue

    const skillId  = recipe.requiredSkill.skillId as SkillId
    const hasLevel = getLevelForXp(state.skills[skillId]?.xp ?? 0) >= recipe.requiredSkill.level
    if (!hasLevel) continue

    result.push(recipe.id)
  }

  return result
}

// ──────────────────────────────────────────────
// Event bus subscription factory
// ──────────────────────────────────────────────

/**
 * Subscribes to ITEM_ADDED and SKILL_LEVEL_UP events to auto-detect
 * new synergy discoveries.
 *
 * @param getState  — Provides fresh state on each check (no stale closures).
 *                    Pass `() => useGameStore.getState()` from the hook.
 * @param onDiscovered — Called once per newly discovered recipe with
 *                       its id and display name. Use this to persist the
 *                       flag and emit the toast from the hook/component layer.
 * @returns unsubscribe function — call on component unmount.
 */
export function subscribeSynergyDiscovery(
  getState: () => Pick<GameState, 'inventory' | 'skills' | 'unlockedFlags'>,
  onDiscovered: (recipeId: string, recipeName: string) => void,
): () => void {
  function check(): void {
    const newIds = checkSynergyDiscovery(getState())
    for (const id of newIds) {
      const recipe = synergiesById.get(id)!
      onDiscovered(id, recipe.name)
    }
  }

  const unsubs = [
    bus.on('ITEM_ADDED',     check),
    bus.on('SKILL_LEVEL_UP', check),
    bus.on('GAME_LOADED',    check),
  ]

  return () => unsubs.forEach(u => u())
}
