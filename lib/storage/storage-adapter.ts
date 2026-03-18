import { GameState } from '../../types/game'

export interface SkillProgress {
  skillId: string
  level: number
  xp: number
}

export interface StorageAdapter {
  loadGameState  (playerId: string): Promise<GameState | null>
  saveGameState  (playerId: string, state: GameState): Promise<void>
  loadSkillProgress(playerId: string): Promise<SkillProgress[]>
  saveSkillProgress(playerId: string, skills: SkillProgress[]): Promise<void>
}

// Implémentation locale / mock simple
export class LocalStorageAdapter implements StorageAdapter {
  private store = new Map<string, any>()

  async loadGameState(id: string)  { return this.store.get(id) ?? null }
  async saveGameState(id: string, s: GameState) { this.store.set(id, s) }
  async loadSkillProgress(id: string) { return this.store.get(`skills_${id}`) ?? [] }
  async saveSkillProgress(id: string, s: SkillProgress[]) { this.store.set(`skills_${id}`, s) }
}

// Implémentation Supabase (mock for now since we do not have the supabase logic yet)
export class SupabaseAdapter implements StorageAdapter {
  async loadGameState(id: string) { return null }
  async saveGameState(id: string, s: GameState) {}
  async loadSkillProgress(id: string) { return [] }
  async saveSkillProgress(id: string, s: SkillProgress[]) {}
}

export class MockAdapter implements StorageAdapter {
  private store = new Map<string, any>()
  async loadGameState(id: string)  { return this.store.get(id) ?? null }
  async saveGameState(id: string, s: GameState) { this.store.set(id, s) }
  async loadSkillProgress(id: string) { return this.store.get(`skills_${id}`) ?? [] }
  async saveSkillProgress(id: string, s: SkillProgress[]) { this.store.set(`skills_${id}`, s) }
}

import { FLAGS } from '../feature-flags'

export function createStorageAdapter(isGuest: boolean): StorageAdapter {
  if (isGuest || !FLAGS.ENABLE_CLOUD_SAVE) return new LocalStorageAdapter()
  return new SupabaseAdapter()
}
