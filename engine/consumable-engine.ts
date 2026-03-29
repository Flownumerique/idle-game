import itemsData from '../items.json'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ConsumableEffect {
  healHp?:            number   // instant HP restore
  attackBonus?:       number   // flat attack bonus (from buffAttack in JSON)
  defenseBonus?:      number   // flat defense bonus (from buffDefense in JSON)
  hpRegenBonus?:      number   // HP/s bonus
  xpMultiplier?:      number   // e.g. 1.5 = +50% XP
  harvestMultiplier?: number   // e.g. 1.3 = +30% yield for gathering
  duration?:          number   // seconds (from buffDuration or duration in JSON)
}

// Raw shape from items.json
interface RawEffect {
  healHp?:         number
  buffAttack?:     number
  buffDefense?:    number
  hpRegenBonus?:   number
  xpBonus?:        number
  harvestBonus?:   number
  buffDuration?:   number
  duration?:       number
}

interface RawItem {
  id:       string
  category: string
  effect?:  RawEffect
}

// ──────────────────────────────────────────────
// Module-level item index
// ──────────────────────────────────────────────

const itemsById = new Map<string, RawItem>()
for (const item of (itemsData as { items: RawItem[] }).items) {
  itemsById.set(item.id, item)
}

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

/**
 * Returns the consumable effect for an item, or null if the item
 * is not a consumable or has no effect.
 */
export function getConsumableEffect(itemId: string): ConsumableEffect | null {
  const item = itemsById.get(itemId)
  if (!item || item.category !== 'consumable' || !item.effect) return null
  const e = item.effect
  const effect: ConsumableEffect = {}
  if (e.healHp      != null) effect.healHp            = e.healHp
  if (e.buffAttack  != null) effect.attackBonus        = e.buffAttack
  if (e.buffDefense != null) effect.defenseBonus       = e.buffDefense
  if (e.hpRegenBonus!= null) effect.hpRegenBonus       = e.hpRegenBonus
  if (e.xpBonus     != null) effect.xpMultiplier       = e.xpBonus
  if (e.harvestBonus!= null) effect.harvestMultiplier  = e.harvestBonus
  const dur = e.buffDuration ?? e.duration
  if (dur != null) effect.duration = dur
  return effect
}

/** Returns true when the item is a consumable with at least one known effect. */
export function isConsumable(itemId: string): boolean {
  return getConsumableEffect(itemId) !== null
}

/**
 * Returns a short human-readable description of the effect for display.
 * e.g. "Restaure 150 HP · +5 ATK (2 min)"
 */
export function describeEffect(effect: ConsumableEffect): string {
  const parts: string[] = []
  if (effect.healHp)            parts.push(`Restaure ${effect.healHp} HP`)
  if (effect.attackBonus)       parts.push(`+${effect.attackBonus} ATK`)
  if (effect.defenseBonus)      parts.push(`+${effect.defenseBonus} DEF`)
  if (effect.hpRegenBonus)      parts.push(`+${effect.hpRegenBonus} Rég./s`)
  if (effect.xpMultiplier && effect.xpMultiplier > 1)
    parts.push(`+${Math.round((effect.xpMultiplier - 1) * 100)}% XP`)
  if (effect.harvestMultiplier && effect.harvestMultiplier > 1)
    parts.push(`+${Math.round((effect.harvestMultiplier - 1) * 100)}% Récolte`)

  let label = parts.join(' · ')
  if (effect.duration && (effect.attackBonus || effect.defenseBonus ||
      effect.hpRegenBonus || effect.xpMultiplier || effect.harvestMultiplier)) {
    const mins = Math.floor(effect.duration / 60)
    const secs = effect.duration % 60
    label += mins > 0 ? ` (${mins} min${secs > 0 ? ` ${secs}s` : ''})` : ` (${secs}s)`
  }
  return label
}
