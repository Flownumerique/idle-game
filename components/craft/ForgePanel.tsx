'use client';

import { useGameStore }            from '@/stores/game-store';
import { getCraftRecipesForSkill, canAffordRecipe } from '@/engine/crafting-engine';
import type { CraftRecipeDef }     from '@/engine/crafting-engine';
import { getLevelForXp, getLevelProgress } from '@/lib/xp-calc';
import { GameData }                from '@/engine/data-loader';
import Button                      from '@/components/ui/Button';
import ProgressBar                 from '@/components/ui/ProgressBar';
import ActiveAction                from '@/components/game/ActiveAction';

const SKILL_ID = 'smithing' as const;

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function itemIcon(itemId: string): string {
  try { return (GameData.item(itemId) as { icon: string }).icon ?? '📦'; } catch { return '📦'; }
}
function itemName(itemId: string): string {
  try { return (GameData.item(itemId) as { name: string }).name ?? itemId; } catch { return itemId; }
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

/** One recipe row */
function RecipeRow({
  recipe,
  inventory,
  isActive,
  onStart,
}: {
  recipe:    CraftRecipeDef;
  inventory: Record<string, number>;
  isActive:  boolean;
  onStart:   () => void;
}) {
  const affordable = canAffordRecipe(recipe, inventory);

  return (
    <div
      className="rounded-sm p-2.5 transition-all"
      style={{
        background: isActive
          ? 'rgba(245,158,11,0.06)'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${
          isActive
            ? 'rgba(245,158,11,0.4)'
            : affordable
              ? 'rgba(255,255,255,0.07)'
              : 'rgba(255,255,255,0.04)'
        }`,
        opacity: affordable ? 1 : 0.55,
      }}
    >
      {/* Recipe header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{itemIcon(recipe.output.itemId)}</span>
        <div className="flex-1 min-w-0">
          <div className="font-cinzel truncate" style={{ fontSize: '0.5rem', color: 'var(--text-primary)' }}>
            {recipe.name}
          </div>
          <div className="font-cinzel" style={{ fontSize: '0.38rem', color: 'var(--text-muted)' }}>
            Niv. {recipe.reqLevel ?? 1} · {recipe.craftTime}s · +{recipe.xpPerCraft} XP
          </div>
        </div>
        <button
          disabled={!affordable}
          onClick={onStart}
          className="flex-shrink-0 font-cinzel rounded-sm px-2 py-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            fontSize: '0.42rem',
            background: isActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isActive ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: isActive ? 'var(--gold-light)' : 'var(--text-secondary)',
          }}
        >
          {isActive ? '↺ En cours' : 'Lancer'}
        </button>
      </div>

      {/* Ingredients */}
      <div className="flex flex-wrap gap-1.5">
        {recipe.inputs.map(input => {
          const have    = inventory[input.itemId] ?? 0;
          const enough  = have >= input.qty;
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
              <span
                className="font-mono"
                style={{ fontSize: '0.42rem', color: enough ? 'var(--color-xp)' : 'rgba(239,68,68,0.9)' }}
              >
                {have}/{input.qty}
              </span>
            </div>
          );
        })}
        {/* Output */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm ml-auto"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <span style={{ fontSize: '0.75rem' }}>→</span>
          <span style={{ fontSize: '0.75rem' }}>{itemIcon(recipe.output.itemId)}</span>
          <span className="font-mono" style={{ fontSize: '0.42rem', color: 'var(--gold-light)' }}>
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

const CATEGORIES: Array<{ label: string; icon: string; match: (id: string) => boolean }> = [
  { label: 'Fonderie',   icon: '🔥', match: id => id.startsWith('smelt_')   },
  { label: 'Armes',      icon: '⚔️', match: id => id.startsWith('forge_sword') || id.startsWith('forge_axe') || id.startsWith('forge_bow') },
  { label: 'Armures',    icon: '🛡️', match: id => id.startsWith('forge_helm') || id.startsWith('forge_chest') || id.startsWith('forge_shield') || id.startsWith('forge_legs') },
  { label: 'Divers',     icon: '🔩', match: () => true },
];

export default function ForgePanel() {
  const skills      = useGameStore(s => s.skills);
  const inventory   = useGameStore(s => s.inventory);
  const activeCraft = useGameStore(s => s.activeCraft);
  const startCraft  = useGameStore(s => s.startCraft);
  const stopCraft   = useGameStore(s => s.stopCraft);
  const addItems    = useGameStore(s => s.addItems);

  const smithingXp    = skills.smithing?.xp ?? 0;
  const smithingLevel = getLevelForXp(smithingXp);
  const xpProgress    = getLevelProgress(smithingXp);

  const recipes = getCraftRecipesForSkill(SKILL_ID, smithingXp);

  // Assign each recipe to the first matching category
  const categorised = CATEGORIES.map(cat => ({
    ...cat,
    recipes: recipes.filter(r => cat.match(r.id) && !CATEGORIES.slice(0, CATEGORIES.indexOf(cat)).some(c => c.match(r.id))),
  })).filter(cat => cat.recipes.length > 0);

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
          <span style={{ fontSize: '1.5rem' }}>🔨</span>
          <div className="flex-1">
            <div className="section-title">Forge</div>
            <div className="font-cinzel" style={{ fontSize: '0.42rem', color: 'var(--text-muted)' }}>
              NIVEAU {smithingLevel}
            </div>
          </div>
        </div>
        <ProgressBar value={xpProgress} height="h-1.5" color="bg-orange-500" />
        <div className="flex justify-between mt-1">
          <span className="font-cinzel" style={{ fontSize: '0.38rem', color: 'var(--text-muted)' }}>XP FORGE</span>
          <span className="font-mono"   style={{ fontSize: '0.4rem',  color: 'var(--text-secondary)' }}>{smithingXp.toLocaleString()}</span>
        </div>
      </div>

      {/* Active craft banner */}
      <ActiveAction skillId="smithing" />

      {/* Recipe categories */}
      {categorised.map(cat => (
        <div key={cat.label} className="game-card space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '1rem' }}>{cat.icon}</span>
            <div className="section-title">{cat.label}</div>
          </div>
          {cat.recipes.map(recipe => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              inventory={inventory}
              isActive={activeCraft?.recipeId === recipe.id && activeCraft.skillId === SKILL_ID}
              onStart={() => handleStart(recipe)}
            />
          ))}
        </div>
      ))}

      {recipes.length === 0 && (
        <div className="game-card text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem' }}>🔒</div>
          <p className="font-cinzel mt-2" style={{ fontSize: '0.45rem' }}>Niveau Forge insuffisant</p>
        </div>
      )}

      {/* Debug */}
      <div className="game-card">
        <div className="section-title mb-3">Matériaux de test</div>
        <Button size="sm" onClick={() => addItems({ ore_copper: 30, ore_iron: 20, ore_steel: 10, charcoal: 30, bar_copper: 5, bar_iron: 5 })}>
          Ajouter matériaux
        </Button>
      </div>
    </div>
  );
}
