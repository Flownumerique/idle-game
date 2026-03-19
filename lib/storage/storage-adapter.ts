import { GameState } from '../../types/game'
import { supabase } from '../supabase'

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

// Implémentation Supabase
export class SupabaseAdapter implements StorageAdapter {
  async loadGameState(id: string): Promise<GameState | null> {
    const { data, error } = await supabase
      .from('game_states')
      .select('state')
      .eq('player_id', id)
      .single()
    if (error || !data) return null
    return data.state as GameState
  }
  
  async saveGameState(id: string, s: GameState): Promise<void> {
    const { error } = await supabase
      .from('game_states')
      .upsert({ player_id: id, state: s, updated_at: new Date().toISOString() }, { onConflict: 'player_id' })
    if (error) console.error('[SupabaseAdapter] Error saving game state:', error)
  }
  
  async loadSkillProgress(id: string): Promise<SkillProgress[]> {
    const { data, error } = await supabase
      .from('skill_progress')
      .select('progress')
      .eq('player_id', id)
      .single()
    if (error || !data) return []
    return data.progress as SkillProgress[]
  }
  
  async saveSkillProgress(id: string, s: SkillProgress[]): Promise<void> {
    const { error } = await supabase
      .from('skill_progress')
      .upsert({ player_id: id, progress: s, updated_at: new Date().toISOString() }, { onConflict: 'player_id' })
    if (error) console.error('[SupabaseAdapter] Error saving skill progress:', error)
  }
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
