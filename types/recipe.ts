// ──────────────────────────────────────────────
// Shared sub-shapes
// ──────────────────────────────────────────────

export interface RecipeInput {
  itemId:    string
  qty:       number
  fromStep?: number   // multistep: output of which prior step feeds this
}

export interface RecipeOutput {
  itemId:  string
  qty:     number
  label?:  string   // override label used in multistep UI
}

export interface RecipeStep {
  step:       number
  name:       string
  skill:      string
  reqLevel:   number
  craftTime:  number
  xpPerCraft: number
  inputs:     RecipeInput[]
  output:     RecipeOutput
}

// ──────────────────────────────────────────────
// Recipe variants
// ──────────────────────────────────────────────

/** One-shot craft — the common case (type absent or 'standard') */
export interface StandardRecipe {
  type?:       'standard' | undefined
  id:          string
  name:        string
  skill:       string
  reqLevel:    number
  craftTime:   number
  xpPerCraft:  number
  inputs:      RecipeInput[]
  output:      RecipeOutput
  unlockZone?: string
  unlockFlag?: string
}

/** Multi-step sequential craft */
export interface MultistepRecipe {
  type:      'multistep'
  id:        string
  name:      string
  reqSkills: Record<string, number>
  totalXp:   number
  steps:     RecipeStep[]
}

/** Permanent upgrade construction */
export interface UpgradeRecipe {
  type:          'upgrade'
  id:            string
  name:          string
  upgradeId:     string
  upgradeLevel:  number
  reqSkills:     Record<string, number>
  craftTime:     number
  xpPerCraft:    number
  inputs:        RecipeInput[]
  effect:        Record<string, unknown>
  description?:  string
}

/** Zone / flag unlock project */
export interface ZoneUnlockRecipe {
  type:         'zoneUnlock'
  id:           string
  name:         string
  unlockZone?:  string
  unlockFlag?:  string
  reqSkills:    Record<string, number>
  craftTime:    number
  xpPerCraft:   number
  inputs:       RecipeInput[]
  description?: string
}

// ──────────────────────────────────────────────
// Synergy recipe — discovered progressively
// ──────────────────────────────────────────────

export interface SynergyIngredient {
  itemId: string
  amount: number
}

/**
 * A synergy recipe is hidden until the player simultaneously owns
 * ≥1 of every ingredient AND meets the required skill level.
 * Once discovered, `discovered` is persisted via GameState.unlockedFlags.
 */
export interface SynergyRecipe {
  type:          'synergy'
  id:            string
  name:          string
  ingredients:   SynergyIngredient[]
  requiredSkill: { skillId: string; level: number }
  output:        { itemId: string; amount: number }
  /** Baseline value from JSON — runtime truth lives in unlockedFlags. */
  discovered:    boolean
}

// ──────────────────────────────────────────────
// Union & helpers
// ──────────────────────────────────────────────

export type AnyRecipe =
  | StandardRecipe
  | MultistepRecipe
  | UpgradeRecipe
  | ZoneUnlockRecipe
  | SynergyRecipe

export function isSynergyRecipe(r: { type?: string }): r is SynergyRecipe {
  return r.type === 'synergy'
}

/** Key stored in GameState.unlockedFlags when a synergy is discovered */
export function synergyDiscoveredFlag(recipeId: string): string {
  return `synergy_${recipeId}`
}
