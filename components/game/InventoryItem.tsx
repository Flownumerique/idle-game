'use client'

import { useGameStore }           from '@/stores/game-store'
import { formatNumber }            from '@/lib/formatters'
import { RARITY_COLOR, RARITY_BORDER, RARITY_LABEL } from '@/lib/rarity'
import {
  isIngredientInAnySynergy,
  getSynergiesForItem,
} from '@/engine/synergy-engine'
import { isConsumable, describeEffect, getConsumableEffect } from '@/engine/consumable-engine'

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
  const unlockedFlags  = useGameStore(s => s.unlockedFlags)
  const activeBuffs    = useGameStore(s => s.activeBuffs)
  const consumeItem    = useGameStore(s => s.consumeItem)

  const name   = item?.name   ?? itemId
  const rarity = item?.rarity ?? 'common'
  const icon   = item?.icon

  // Consumable state
  const consumable    = isConsumable(itemId)
  const effect        = consumable ? getConsumableEffect(itemId) : null
  const activeBuff    = activeBuffs?.find(b => b.itemId === itemId && b.expiresAt > Date.now())
  const effectLabel   = effect ? describeEffect(effect) : ''
  const remaining     = activeBuff ? Math.max(0, Math.ceil((activeBuff.expiresAt - Date.now()) / 1000)) : 0

  // Synergy badge — shown when item is ingredient in any synergy recipe
  const hasSynergyRole  = isIngredientInAnySynergy(itemId)
  const synergies       = hasSynergyRole
    ? getSynergiesForItem(itemId, { unlockedFlags })
    : []
  const anyDiscovered   = synergies.some(s => s.isDiscovered)
  const synergyTooltip  = buildSynergyTooltip(synergies)

  return (
    <div
      className="relative flex flex-col p-2 gap-1.5"
      style={{
        background: activeBuff ? 'rgba(34,197,94,0.04)' : 'var(--surface-card)',
        border: `2px solid ${activeBuff ? 'rgba(34,197,94,0.4)' : RARITY_BORDER[rarity] ?? 'var(--border-default)'}`,
      }}
      title={effectLabel ? `${name}\n${effectLabel}` : `${name} — ${RARITY_LABEL[rarity] ?? rarity}`}
    >
      {/* Row 1: icon + name + qty */}
      <div className="flex items-center gap-2">
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

        <span
          className="font-cinzel flex-shrink-0"
          style={{ fontSize: '0.5rem', color: 'var(--text-secondary)' }}
        >
          ×{formatNumber(qty)}
        </span>
      </div>

      {/* Row 2: effect label (consumables only) */}
      {effectLabel && (
        <div className="font-cinzel leading-snug" style={{ fontSize: '0.38rem', color: 'rgba(134,239,172,0.8)' }}>
          {effectLabel}
        </div>
      )}

      {/* Row 3: active buff countdown or Utiliser button */}
      {consumable && (
        activeBuff ? (
          <div
            className="font-cinzel text-center py-0.5 rounded-sm"
            style={{
              fontSize: '0.38rem',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: 'rgba(134,239,172,0.9)',
            }}
          >
            Actif — {remaining >= 60
              ? `${Math.floor(remaining / 60)}m ${remaining % 60}s`
              : `${remaining}s`}
          </div>
        ) : (
          <button
            onClick={() => consumeItem(itemId)}
            disabled={qty <= 0}
            className="w-full font-cinzel py-0.5 rounded-sm transition-all disabled:opacity-40"
            style={{
              fontSize: '0.4rem',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: 'rgba(134,239,172,0.9)',
            }}
          >
            Utiliser
          </button>
        )
      )}

      {/* ✦ Synergy badge — top-right corner */}
      {hasSynergyRole && (
        <span
          title={synergyTooltip}
          className="absolute top-0.5 right-0.5 leading-none cursor-help select-none"
          style={{
            fontSize: '0.6rem',
            color: anyDiscovered ? 'var(--gold-light)' : 'rgba(192,132,252,0.6)',
          }}
          aria-label={synergyTooltip}
        >
          ✦
        </span>
      )}
    </div>
  )
}
