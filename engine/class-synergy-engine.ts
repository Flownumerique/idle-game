import type { GameState } from '../types/game'
import { CLASS_SYNERGIES, synergySynergyFlagKey, SYNERGY_STATE_KEYS } from '../types/class-synergy'
import { evaluateCondition } from './unlock-engine'
import { bus } from './event-bus'

// ──────────────────────────────────────────────
// Query helpers
// ──────────────────────────────────────────────

export function isSynergyUnlocked(synergyId: string, state: GameState): boolean {
  return state.unlockedFlags.includes(synergySynergyFlagKey(synergyId))
}

export function getActiveSynergies(state: GameState) {
  return CLASS_SYNERGIES.filter(s => isSynergyUnlocked(s.id, state))
}

/** Returns all synergies whose conditions are now met but not yet flagged. */
export function checkSynergyUnlocks(state: GameState): typeof CLASS_SYNERGIES {
  return CLASS_SYNERGIES.filter(
    s => !isSynergyUnlocked(s.id, state) && evaluateCondition(s.condition, state),
  )
}

// ──────────────────────────────────────────────
// Subscription factory (called once by the hook)
// ──────────────────────────────────────────────

/**
 * Subscribes to relevant bus events to:
 *  1. Unlock new synergies when skill level thresholds are reached
 *  2. Increment Warrior fury stacks on kills (and reset if expired)
 *  3. Trigger Mage potion bonus on ITEM_REMOVED for consumables
 *  4. Check on game load
 *
 * Returns an unsubscribe function.
 */
export function subscribeClassSynergyChecks(
  getState: () => GameState,
  callbacks: {
    onUnlocked:       (synergyId: string, synergyName: string) => void
    setSynergyState:  (update: Record<string, number>) => void
    setFlag:          (flag: string) => void
  },
): () => void {
  function runUnlockCheck() {
    const state = getState()
    for (const synergy of checkSynergyUnlocks(state)) {
      callbacks.setFlag(synergySynergyFlagKey(synergy.id))
      callbacks.onUnlocked(synergy.id, synergy.name)
    }
  }

  function handleMonsterKilled() {
    const state  = getState()
    // Only apply if Warrior synergy is active
    const furyActive = isSynergyUnlocked('warrior_berserker_fury', state)
    if (!furyActive) return

    const synergy    = state.synergyState ?? {}
    const now        = Date.now()
    const lastKill   = synergy[SYNERGY_STATE_KEYS.furyLastKillAt] ?? 0
    const expired    = lastKill > 0 && (now - lastKill) >= 60_000
    const curStacks  = expired ? 0 : (synergy[SYNERGY_STATE_KEYS.furyStacks] ?? 0)
    const newStacks  = Math.min(curStacks + 1, 20)
    callbacks.setSynergyState({
      [SYNERGY_STATE_KEYS.furyStacks]:     newStacks,
      [SYNERGY_STATE_KEYS.furyLastKillAt]: now,
    })
  }

  function handleItemRemoved({ itemId }: { itemId: string }) {
    const state = getState()
    if (!isSynergyUnlocked('mage_alchemical_catalysis', state)) return
    // Treat any item in the consumable category as a potion
    // We check the item id prefix used in items.json ('potion_', 'elixir_', 'brew_')
    const isPotion = itemId.startsWith('potion_') || itemId.startsWith('elixir_') || itemId.startsWith('brew_')
    if (!isPotion) return
    callbacks.setSynergyState({
      [SYNERGY_STATE_KEYS.magePotionBonusUntil]: Date.now() + 120_000,
    })
  }

  const unsubs = [
    bus.on('SKILL_LEVEL_UP', runUnlockCheck),
    bus.on('GAME_LOADED',    runUnlockCheck),
    bus.on('MONSTER_KILLED', handleMonsterKilled),
    bus.on('ITEM_REMOVED',   handleItemRemoved),
  ]

  // Run once on subscription (catches condition already met before subscription)
  runUnlockCheck()

  return () => unsubs.forEach(u => u())
}
