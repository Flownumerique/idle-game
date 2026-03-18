import { GameState } from '../../types/game'
import { migrateSave, SAVE_VERSION } from '../save-migrations'
import { createStorageAdapter } from '../storage/storage-adapter'
import { bus } from '../../engine/event-bus'

export async function migrateGuestSaveToAccount(newUserId: string): Promise<boolean> {
  // 1. DÉTECTION
  const rawGuestSaveStr = localStorage.getItem('idle-realms-guest-save')
  if (!rawGuestSaveStr) return true // Rien à migrer

  let guestSave: any
  try {
    guestSave = JSON.parse(rawGuestSaveStr)
  } catch (err) {
    console.error('Failed to parse guest save', err)
    return false
  }

  // Vérifier que la save est valide
  let state: GameState
  try {
    state = migrateSave(guestSave)
  } catch (err) {
    console.error('Failed to migrate guest save', err)
    return false
  }

  // 3. CONFLIT (omitted complex user interaction, handled simply as overwrite here if no conflict prompt)
  const cloudAdapter = createStorageAdapter(false)
  const existingCloudSave = await cloudAdapter.loadGameState(newUserId)

  if (existingCloudSave) {
    // In a real flow, a modal would appear here. Assuming user chose to keep local save:
    // This is just a stub for the architecture logic.
  }

  // 4. UPLOAD
  try {
    state.player.id = newUserId
    await cloudAdapter.saveGameState(newUserId, state)
  } catch (err) {
    console.error('Failed to upload migrated save', err)
    // Save guest conservée
    return false
  }

  // 5. NETTOYAGE
  localStorage.removeItem('idle-realms-guest-save')
  localStorage.removeItem('idle-realms-guest-id')
  localStorage.setItem('idle-realms-user-id', newUserId)

  bus.emit('GAME_LOADED', { isGuest: false, offlineDuration: 0 })

  return true
}
