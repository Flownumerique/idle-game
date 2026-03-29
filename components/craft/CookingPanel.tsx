'use client';

import { useGameStore }            from '@/stores/game-store';
import { getCraftRecipesForSkill, canCraft } from '@/engine/crafting-engine';
import type { CraftRecipeDef }     from '@/engine/crafting-engine';
import { getConsumableEffect, describeEffect } from '@/engine/consumable-engine';
import { getLevelForXp, getLevelProgress } from '@/lib/xp-calc';
import { GameData }                from '@/engine/data-loader';
import Button                      from '@/components/ui/Button';
import ProgressBar                 from '@/components/ui/ProgressBar';
import ActiveAction                from '@/components/game/ActiveAction';

const SKILL_ID = 'cooking' as const;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function itemIcon(itemId: string): string {
  try { return (GameData.item(itemId) as { icon: string }).icon ?? '🍽️'; } catch { return '🍽️'; }
}
function itemName(itemId: string): string {
  try { return (GameData.item(itemId) as { name: string }).name ?? itemId; } catch { return itemId; }
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function EffectBadge({ itemId }: { itemId: string }) {
  const effect = getConsumableEffect(itemId);
  if (!effect) return null;
  const label = describeEffect(effect);
  return (
    <div
      className="mt-1.5 px-1.5 py-0.5 rounded-sm inline-block"
      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
    >
      <span className="font-cinzel" style={{ fontSize: '0.38rem', color: 'rgba(134,239,172,0.9)' }}>
        ✦ {label}
      </span>
    </div>
  );
}

function RecipeRow({
  recipe,
  inventory,
  skills,
  isActive,
  onStart,
}: {
  recipe:    CraftRecipeDef;
  inventory: Record<string, number>;
  skills:    Record<string, { xp: number }>;
  isActive:  boolean;
  onStart:   () => void;
}) {
  const affordable = canCraft(recipe.id, inventory, skills);

  return (
    <div
      className="rounded-sm p-2.5 transition-all"
      style={{
        background: isActive ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${
          isActive ? 'rgba(34,197,94,0.35)' :
          affordable ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'
        }`,
        opacity: affordable ? 1 : 0.55,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{itemIcon(recipe.output.itemId)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-cinzel truncate" style={{ fontSize: '0.5rem', color: 'var(--text-primary)' }}>
            {recipe.name}
          </div>
          <div className="font-cinzel" style={{ fontSize: '0.38rem', color: 'var(--text-muted)' }}>
            Niv. {recipe.reqLevel ?? 1} · {recipe.craftTime}s · +{recipe.xpPerCraft} XP
          </div>
          <EffectBadge itemId={recipe.output.itemId} />
        </div>
        <button
          disabled={!affordable}
          onClick={onStart}
          className="flex-shrink-0 font-cinzel rounded-sm px-2 py-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            fontSize: '0.42rem',
            background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isActive ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: isActive ? 'rgba(134,239,172,0.9)' : 'var(--text-secondary)',
          }}
        >
          {isActive ? '↺ En cours' : 'Cuisiner'}
        </button>
      </div>

      {/* Ingredients */}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {recipe.inputs.map(input => {
          const have   = inventory[input.itemId] ?? 0;
          const enough = have >= input.qty;
          return (
            <div
              key={input.itemId}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
              style={{
                background: enough ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${enough ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              <span style={{ fontSize: '0.75rem' }}>{itemIcon(input.itemId)}</span>
              <span className="font-cinzel" style={{ fontSize: '0.38rem', color: 'var(--text-muted)' }}>
                {itemName(input.itemId)}
              </span>
              <span className="font-mono" style={{ fontSize: '0.42rem', color: enough ? 'var(--color-xp)' : 'rgba(239,68,68,0.9)' }}>
                {have}/{input.qty}
              </span>
            </div>
          );
        })}
        {/* Output */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm ml-auto"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <span style={{ fontSize: '0.75rem' }}>→</span>
          <span style={{ fontSize: '0.75rem' }}>{itemIcon(recipe.output.itemId)}</span>
          <span className="font-mono" style={{ fontSize: '0.42rem', color: 'rgba(134,239,172,0.9)' }}>
            ×{recipe.output.qty}
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Panel
// ──────────────────────────────────────────────

export default function CookingPanel() {
  const skills      = useGameStore(s => s.skills);
  const inventory   = useGameStore(s => s.inventory);
  const activeCraft = useGameStore(s => s.activeCraft);
  const startCraft  = useGameStore(s => s.startCraft);
  const stopCraft   = useGameStore(s => s.stopCraft);
  const addItems    = useGameStore(s => s.addItems);

  const cookingXp    = skills.cooking?.xp ?? 0;
  const cookingLevel = getLevelForXp(cookingXp);
  const xpProgress   = getLevelProgress(cookingXp);

  const recipes = getCraftRecipesForSkill(SKILL_ID, cookingXp);

  function handleStart(recipe: CraftRecipeDef) {
    if (activeCraft?.recipeId === recipe.id && activeCraft.skillId === SKILL_ID) {
      stopCraft();
    } else {
      startCraft(recipe.id, SKILL_ID);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="game-card">
        <div className="flex items-center gap-3 mb-4">
          <span style={{ fontSize: '1.5rem' }}>🍳</span>
          <div className="flex-1">
            <div className="section-title">Cuisine</div>
            <div className="font-cinzel" style={{ fontSize: '0.42rem', color: 'var(--text-muted)' }}>
              NIVEAU {cookingLevel}
            </div>
          </div>
        </div>
        <ProgressBar value={xpProgress} height="h-1.5" color="bg-green-500" />
        <div className="flex justify-between mt-1">
          <span className="font-cinzel" style={{ fontSize: '0.38rem', color: 'var(--text-muted)' }}>XP CUISINE</span>
          <span className="font-mono"   style={{ fontSize: '0.4rem',  color: 'var(--text-secondary)' }}>{cookingXp.toLocaleString()}</span>
        </div>
      </div>

      {/* Active craft */}
      <ActiveAction skillId="cooking" />

      {/* Recipes */}
      {recipes.length === 0 ? (
        <div className="game-card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem' }}>🔒</div>
          <p className="font-cinzel mt-2" style={{ fontSize: '0.45rem' }}>
            Niveau Cuisine insuffisant
          </p>
          <p className="font-crimson mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Pêchez des poissons pour commencer à cuisiner
          </p>
        </div>
      ) : (
        <div className="game-card space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '1rem' }}>🍽️</span>
            <div className="section-title">Recettes</div>
          </div>
          {recipes.map(recipe => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              inventory={inventory}
              skills={skills}
              isActive={activeCraft?.recipeId === recipe.id && activeCraft.skillId === SKILL_ID}
              onStart={() => handleStart(recipe)}
            />
          ))}
        </div>
      )}

      {/* Debug helper */}
      <div className="game-card">
        <div className="section-title mb-3">Ingrédients de test</div>
        <Button size="sm" onClick={() => addItems({
          fish_sardine: 10, fish_trout: 10, fish_salmon: 10,
          herb_healing: 20, herb_healing_enchanted: 5,
          wheat: 20, flower_golden: 5,
        })}>
          Ajouter ingrédients
        </Button>
      </div>
    </div>
  );
}
