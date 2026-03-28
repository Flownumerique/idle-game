'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/stores/game-store'
import { subscribeSynergyDiscovery } from '@/engine/synergy-engine'
import { synergyDiscoveredFlag } from '@/types/recipe'

/**
 * Mount once at app root (alongside useUnlocks).
 * Subscribes to item-gain and skill-up events, persists new synergy
 * discoveries into unlockedFlags, and pushes an achievement log entry.
 */
export function useSynergyDiscovery(): void {
  useEffect(() => {
    const unsubscribe = subscribeSynergyDiscovery(
      // Fresh state snapshot — avoids stale closures in bus callbacks
      () => useGameStore.getState(),
      (recipeId, recipeName) => {
        const store = useGameStore.getState()
        store.setFlag(synergyDiscoveredFlag(recipeId))
        store.addLogEntry({
          type:      'achievement',
          message:   `✨ Combinaison découverte : ${recipeName}`,
          timestamp: Date.now(),
        })
      },
    )
    return unsubscribe
  }, [])
}
