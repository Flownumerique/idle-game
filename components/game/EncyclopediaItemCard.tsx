'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/game-store'
import { getSynergiesForItem, isIngredientInAnySynergy } from '@/engine/synergy-engine'
import type { SynergyRecipe } from '@/types/recipe'

interface ItemDef {
  id:           string
  name:         string
  rarity:       string
  category:     string
  icon?:        string
  description?: string
}

interface EncyclopediaItemCardProps {
  item:         ItemDef
  isDiscovered: boolean
  onNavigate?:  (tab: string) => void
}

// ──────────────────────────────────────────────
// "Usages connus" — single synergy row
// ──────────────────────────────────────────────

function DiscoveredUsage({ recipe, onNavigate }: { recipe: SynergyRecipe; onNavigate?: (tab: string) => void }) {
  return (
    <div
      className="rounded-sm p-2.5 space-y-1.5"
      style={{ background: 'rgba(201,146,42,0.06)', border: '1px solid rgba(201,146,42,0.25)' }}
    >
      {/* Recipe name */}
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: '0.75rem' }}>✦</span>
        <span
          className="font-cinzel tracking-wide"
          style={{ fontSize: '0.6rem', color: 'var(--gold-light)' }}
        >
          {recipe.name}
        </span>
      </div>

      {/* Other ingredients */}
      <div className="space-y-0.5 pl-4">
        {recipe.ingredients.map(ing => (
          <div
            key={ing.itemId}
            className="font-crimson"
            style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}
          >
            + {ing.itemId} ×{ing.amount}
          </div>
        ))}
      </div>

      {/* Skill requirement */}
      <div
        className="font-cinzel tracking-wide pl-4"
        style={{ fontSize: '0.5rem', color: 'rgba(96,165,250,0.8)' }}
      >
        Nécessite : {recipe.requiredSkill.skillId} niv. {recipe.requiredSkill.level}
      </div>

      {/* Output */}
      <div
        className="font-crimson pl-4"
        style={{ fontSize: '0.65rem', color: 'var(--color-xp)' }}
      >
        → {recipe.output.itemId} ×{recipe.output.amount}
      </div>

      {/* Navigate to craft */}
      <button
        className="font-cinzel tracking-widest uppercase w-full text-center py-1 rounded-sm mt-0.5 transition-colors"
        style={{
          fontSize: '0.45rem',
          color: 'var(--gold-light)',
          background: 'rgba(201,146,42,0.12)',
          border: '1px solid rgba(201,146,42,0.3)',
        }}
        onClick={() => onNavigate?.('skills')}
      >
        Accéder au craft →
      </button>
    </div>
  )
}

function UnknownUsage() {
  return (
    <div
      className="rounded-sm p-2.5 text-center space-y-1"
      style={{
        background: 'rgba(192,132,252,0.04)',
        border: '1px solid rgba(192,132,252,0.2)',
        filter: 'blur(0px)', // container is clear; text is muted
      }}
    >
      <div style={{ fontSize: '1.1rem' }}>🔒</div>
      <div
        className="font-cinzel tracking-widest uppercase"
        style={{ fontSize: '0.5rem', color: 'rgba(192,132,252,0.8)' }}
      >
        ✦ Combinaison inconnue
      </div>
      <div
        className="font-crimson italic leading-relaxed"
        style={{
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          // Blur the hint text to suggest hidden info
          filter: 'blur(2px)',
          userSelect: 'none',
        }}
      >
        Cette ressource peut être combinée avec d&apos;autres ingrédients pour créer quelque chose de puissant...
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// "Usages connus" section
// ──────────────────────────────────────────────

function SynergyUsageSection({ itemId, onNavigate }: { itemId: string; onNavigate?: (tab: string) => void }) {
  const unlockedFlags = useGameStore(s => s.unlockedFlags)
  const synergies     = getSynergiesForItem(itemId, { unlockedFlags })

  if (synergies.length === 0) return null

  return (
    <div className="mt-3 space-y-1.5">
      <div
        className="font-cinzel tracking-widest uppercase"
        style={{ fontSize: '0.45rem', color: 'var(--text-muted)', letterSpacing: '0.2em' }}
      >
        Usages connus
      </div>
      {synergies.map(({ recipe, isDiscovered }) =>
        isDiscovered
          ? <DiscoveredUsage key={recipe.id} recipe={recipe} onNavigate={onNavigate} />
          : <UnknownUsage    key={recipe.id} />,
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main card
// ──────────────────────────────────────────────

export default function EncyclopediaItemCard({
  item,
  isDiscovered,
  onNavigate,
}: EncyclopediaItemCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasSynergyRole = isIngredientInAnySynergy(item.id)

  return (
    <div
      className={`relative p-3 rounded-sm border flex flex-col items-center text-center transition-all h-full cursor-pointer
        ${isDiscovered ? 'bg-[#16213e] border-slate-600' : 'bg-[#0d1525] border-slate-800 opacity-70'}`}
      onClick={() => isDiscovered && setExpanded(e => !e)}
    >
      {/* Synergy indicator dot (top-left) */}
      {isDiscovered && hasSynergyRole && (
        <span
          className="absolute top-1 left-1.5 leading-none"
          style={{ fontSize: '0.55rem', color: 'var(--gold-light)' }}
          title="Cet objet entre dans une synergie"
        >
          ✦
        </span>
      )}

      {/* Icon */}
      <div className={`text-4xl mb-2 ${!isDiscovered ? 'grayscale opacity-30 select-none' : ''}`}>
        {isDiscovered ? (item.icon ?? '📦') : '❓'}
      </div>

      {/* Name */}
      <div
        className={`font-cinzel text-[0.55rem] tracking-wide mb-1 leading-tight
          ${isDiscovered ? 'text-slate-200' : 'text-slate-600'}`}
      >
        {isDiscovered ? item.name : 'INCONNU'}
      </div>

      {/* Description */}
      {isDiscovered && item.description && (
        <div className="font-crimson text-[10px] text-slate-400 mt-2 leading-tight italic">
          &ldquo;{item.description}&rdquo;
        </div>
      )}

      {/* ── Expanded: Usages connus ── */}
      {isDiscovered && expanded && (
        <div className="w-full mt-2 text-left" onClick={e => e.stopPropagation()}>
          <SynergyUsageSection itemId={item.id} onNavigate={onNavigate} />
        </div>
      )}

      {/* Expand hint */}
      {isDiscovered && hasSynergyRole && !expanded && (
        <div
          className="mt-2 font-cinzel tracking-widest"
          style={{ fontSize: '0.4rem', color: 'rgba(192,132,252,0.6)' }}
        >
          ✦ Voir les usages
        </div>
      )}
    </div>
  )
}
