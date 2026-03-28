'use client'

import { useEffect } from 'react'
import { useGameStore }    from '@/stores/game-store'
import { bus }             from '@/engine/event-bus'
import { checkAllUnlocks } from '@/engine/unlock-engine'
import { unlockFlagKey }   from '@/types/unlock'
import type { UnlockEvent } from '@/types/unlock'

// ──────────────────────────────────────────────
// Events that can satisfy an unlock condition
// ──────────────────────────────────────────────
const TRIGGER_EVENTS = [
  'ITEM_ADDED',
  'SKILL_LEVEL_UP',
  'CRAFT_COMPLETED',
  'MONSTER_KILLED',
  'UPGRADE_BUILT',
  'QUEST_COMPLETED',
  'GAME_LOADED',
] as const

// ──────────────────────────────────────────────
// Notification (uses existing achievement log,
// swap for a toast library if one is added later)
// ──────────────────────────────────────────────

function notifyUnlock(event: UnlockEvent): void {
  const kindLabel =
    event.kind === 'skill'  ? 'Compétence' :
    event.kind === 'action' ? 'Action'     : 'Recette'

  useGameStore.getState().addLogEntry({
    type:      'achievement',
    message:   `🔓 ${kindLabel} débloquée : ${event.name}`,
    timestamp: Date.now(),
  })
}

// ──────────────────────────────────────────────
// Hook
// Mount once at app root (e.g. inside GameLayout)
// ──────────────────────────────────────────────

export function useUnlocks(): void {
  useEffect(() => {
    /**
     * Read the latest state synchronously via getState() to avoid
     * stale-closure issues inside event callbacks, then apply all
     * newly satisfied unlock conditions in one pass.
     */
    function runCheck(): void {
      const state = useGameStore.getState()
      const events = checkAllUnlocks(state)

      for (const event of events) {
        // Persist the unlock — setFlag guards against duplicates internally
        useGameStore.getState().setFlag(unlockFlagKey(event.kind, event.id))
        notifyUnlock(event)
      }
    }

    const unsubs = TRIGGER_EVENTS.map(ev => bus.on(ev, runCheck))

    // Also run once on mount to catch unlocks already valid from a loaded save
    runCheck()

    return () => unsubs.forEach(unsub => unsub())
  }, []) // empty deps — bus singleton is stable for the app lifetime
}
