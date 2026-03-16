import recipesData from "@/recipes.json";
import { getLevelForXp } from "@/lib/xp-calc";
import type { SkillId } from "@/types/game";

// ──────────────────────────────────────────────
// Data types (matching actual recipes.json shape)
// ──────────────────────────────────────────────

interface RecipeInput {
  itemId: string;
  qty: number;
}

interface RecipeOutput {
  itemId: string;
  qty: number;
}

interface RecipeStep {
  inputs: RecipeInput[];
  output: RecipeOutput;
  craftTime: number;
  xpPerCraft: number;
  skill: string;
  reqLevel: number;
}

interface Recipe {
  id: string;
  name: string;
  skill: string;
  reqLevel: number;
  craftTime: number;
  xpPerCraft: number;
  inputs?: RecipeInput[];
  output?: RecipeOutput;
  steps?: RecipeStep[];
  type?: string; // "unlock", "upgrade", etc.
  reqSkills?: Record<string, number>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allRecipes: Recipe[] = ((recipesData as any).recipes as Recipe[]);
const recipesById = new Map<string, Recipe>(allRecipes.map((r) => [r.id, r]));

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

export function getRecipe(id: string): Recipe | undefined {
  return recipesById.get(id);
}

export function getRecipesForSkill(
  skillId: string,
  skillLevel: number
): Recipe[] {
  return allRecipes.filter(
    (r) => r.skill === skillId && r.reqLevel <= skillLevel
  );
}

// ──────────────────────────────────────────────
// Craft attempt
// ──────────────────────────────────────────────

export interface CraftResult {
  success: boolean;
  reason?: string;
  consumedItems: Record<string, number>;
  producedItems: Record<string, number>;
  xpGained: number;
}

export function attemptCraft(
  recipeId: string,
  inventory: Record<string, number>,
  skillXp: Partial<Record<SkillId, number>>,
  quantity = 1
): CraftResult {
  const recipe = recipesById.get(recipeId);
  if (!recipe) {
    return { success: false, reason: "Recipe not found", consumedItems: {}, producedItems: {}, xpGained: 0 };
  }

  const skillLevel = getLevelForXp(skillXp[recipe.skill as SkillId] ?? 0);
  if (skillLevel < recipe.reqLevel) {
    return {
      success: false,
      reason: `Requires ${recipe.skill} level ${recipe.reqLevel}`,
      consumedItems: {},
      producedItems: {},
      xpGained: 0,
    };
  }

  // Multi-skill requirements (for unlock/upgrade recipes)
  if (recipe.reqSkills) {
    for (const [sk, lvl] of Object.entries(recipe.reqSkills)) {
      const have = getLevelForXp(skillXp[sk as SkillId] ?? 0);
      if (have < lvl) {
        return {
          success: false,
          reason: `Requires ${sk} level ${lvl}`,
          consumedItems: {},
          producedItems: {},
          xpGained: 0,
        };
      }
    }
  }

  if (recipe.steps) {
    return {
      success: false,
      reason: "Multi-step recipe: use step-by-step crafting",
      consumedItems: {},
      producedItems: {},
      xpGained: 0,
    };
  }

  if (!recipe.inputs || !recipe.output) {
    return { success: false, reason: "Invalid recipe data", consumedItems: {}, producedItems: {}, xpGained: 0 };
  }

  const consumed: Record<string, number> = {};
  for (const input of recipe.inputs) {
    const have = inventory[input.itemId] ?? 0;
    const need = input.qty * quantity;
    if (have < need) {
      return {
        success: false,
        reason: `Not enough ${input.itemId} (need ${need}, have ${have})`,
        consumedItems: {},
        producedItems: {},
        xpGained: 0,
      };
    }
    consumed[input.itemId] = need;
  }

  const produced: Record<string, number> = {
    [recipe.output.itemId]: recipe.output.qty * quantity,
  };

  return {
    success: true,
    consumedItems: consumed,
    producedItems: produced,
    xpGained: recipe.xpPerCraft * quantity,
  };
}
