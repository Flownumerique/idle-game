'use client'

import { useEffect, useRef } from 'react'
import { useGameStore }           from '@/stores/game-store'
import { subscribeClassSynergyChecks } from '@/engine/class-synergy-engine'
import { SYNERGY_STATE_KEYS }     from '@/types/class-synergy'
import { isSynergyUnlocked }      from '@/engine/class-synergy-engine'

const FORESTER_INTERVAL_MS = 30_000

/**
 * Mounts class synergy side-effects:
 *  - Unlock checks on SKILL_LEVEL_UP / GAME_LOADED (Warrior, Forester, Mage)
 *  - Warrior kill-stack increment on MONSTER_KILLED
 *  - Mage potion XP bonus on ITEM_REMOVED
 *  - Forester passive harvest tick every 30 s (via setInterval)
 */
export function useClassSynergy(): void {
  const setSynergyState = useGameStore(s => s.setSynergyState)
  const setFlag         = useGameStore(s => s.setFlag)
  const addLogEntry     = useGameStore(s => s.addLogEntry)
  const addItems        = useGameStore(s => s.addItems)

  // Keep a stable ref so the forester interval always sees current state
  const addItemsRef  = useRef(addItems)
  addItemsRef.current = addItems

  useEffect(() => {
    // ── Bus subscriptions (unlock + warrior + mage) ───────────────────────
    const unsubBus = subscribeClassSynergyChecks(
      () => useGameStore.getState(),
      {
        onUnlocked: (_id, name) => {
          addLogEntry({
            type:      'achievement',
            message:   `✦ Synergie débloquée : ${name}`,
            timestamp: Date.now(),
          })
        },
        setSynergyState: (update) => useGameStore.getState().setSynergyState(update),
        setFlag:         (flag)   => useGameStore.getState().setFlag(flag),
      },
    )

    // ── Forester harvest tick ─────────────────────────────────────────────
    const foresterTimer = setInterval(() => {
      const state = useGameStore.getState()
      if (!isSynergyUnlocked('forester_natural_symbiosis', state)) return

      const synergy       = state.synergyState ?? {}
      const lastHarvestAt = synergy[SYNERGY_STATE_KEYS.forestLastHarvestAt] ?? 0
      if (Date.now() - lastHarvestAt < FORESTER_INTERVAL_MS) return

      // Find the most-held item in inventory
      let bestItemId  = ''
      let bestQty     = 0
      for (const [itemId, qty] of Object.entries(state.inventory)) {
        if (qty > bestQty) { bestQty = qty; bestItemId = itemId }
      }
      if (!bestItemId) return

      addItemsRef.current({ [bestItemId]: 1 })
      useGameStore.getState().setSynergyState({
        [SYNERGY_STATE_KEYS.forestLastHarvestAt]: Date.now(),
      })
    }, 5_000) // poll every 5 s, fire when interval elapsed

    return () => {
      unsubBus()
      clearInterval(foresterTimer)
    }
  }, [addLogEntry, setFlag, setSynergyState])
}
