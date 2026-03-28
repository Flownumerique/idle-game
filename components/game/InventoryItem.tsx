'use client'

import { useGameStore }           from '@/stores/game-store'
import { formatNumber }            from '@/lib/formatters'
import { RARITY_COLOR, RARITY_BORDER, RARITY_LABEL } from '@/lib/rarity'
import {
  isIngredientInAnySynergy,
  getSynergiesForItem,
} from '@/engine/synergy-engine'

interface ItemDef {
  id:       string
  name:     string
  rarity:   string
  category: string
  icon?:    string
}

interface InventoryItemProps {
  itemId: string
  qty:    number
  item:   ItemDef | undefined
}

// ──────────────────────────────────────────────
// Synergy tooltip text
// ──────────────────────────────────────────────

function buildSynergyTooltip(
  synergies: Array<{ recipe: { name: string }; isDiscovered: boolean }>,
): string {
  if (synergies.length === 0) return ''

  const lines = synergies.map(({ recipe, isDiscovered }) =>
    isDiscovered
      ? `Utilisé dans : ${recipe.name}`
      : 'Cette ressource entre dans une combinaison inconnue...',
  )
  return lines.join('\n')
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function InventoryItem({ itemId, qty, item }: InventoryItemProps) {
  const unlockedFlags = useGameStore(s => s.unlockedFlags)

  const name   = item?.name   ?? itemId
  const rarity = item?.rarity ?? 'common'
  const icon   = item?.icon

  // Synergy badge — shown when item is ingredient in any synergy recipe
  const hasSynergyRole  = isIngredientInAnySynergy(itemId)
  const synergies       = hasSynergyRole
    ? getSynergiesForItem(itemId, { unlockedFlags })
    : []
  const anyDiscovered   = synergies.some(s => s.isDiscovered)
  const synergyTooltip  = buildSynergyTooltip(synergies)

  return (
    <div
      className="relative flex items-center gap-2 p-2"
      style={{
        background: 'var(--surface-card)',
        border: `2px solid ${RARITY_BORDER[rarity] ?? 'var(--border-default)'}`,
      }}
      title={`${name} — ${RARITY_LABEL[rarity] ?? rarity}`}
    >
      {/* Item icon */}
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 28, height: 28,
          border: `1px solid ${RARITY_BORDER[rarity] ?? 'var(--border-default)'}`,
          background: 'var(--surface-elevated)',
          fontSize: 14,
          imageRendering: 'pixelated',
        }}
      >
        {icon ?? '◻'}
      </span>

      {/* Name + rarity label */}
      <div className="min-w-0 flex-1">
        <div
          className="font-crimson text-xs truncate"
          style={{ color: RARITY_COLOR[rarity] ?? 'var(--text-secondary)' }}
        >
          {name}
        </div>
        <div
          className="font-cinzel"
          style={{ fontSize: '0.38rem', color: 'var(--text-muted)' }}
        >
          {RARITY_LABEL[rarity] ?? rarity}
        </div>
      </div>

      {/* Quantity */}
      <span
        className="font-cinzel flex-shrink-0"
        style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}
      >
        ×{formatNumber(qty)}
      </span>

      {/* ✦ Synergy badge — top-right corner */}
      {hasSynergyRole && (
        <span
          title={synergyTooltip}
          className="absolute top-0.5 right-0.5 leading-none cursor-help select-none"
          style={{
            fontSize: '0.6rem',
            // Gold if any recipe is discovered; muted purple if all unknown
            color: anyDiscovered
              ? 'var(--gold-light)'
              : 'rgba(192,132,252,0.6)',
          }}
          aria-label={synergyTooltip}
        >
          ✦
        </span>
      )}
    </div>
  )
}
