import { SkillId, SlotId, ItemDrop, QuestReward, OfflineSummary } from '../types/game'

export type GameEventMap = {
  // Combat
  MONSTER_KILLED:    { monsterId: string; zoneId: string; loot: ItemDrop[]; xpGained: number }
  COMBAT_XP_GAINED:  { gains: Array<{ skillId: SkillId; amount: number }> }
  PLAYER_DAMAGED:    { damage: number; source: string; newHp: number }
  PLAYER_DIED:       { zoneId: string; killedBy: string }
  ATTACK_DODGED:     { attackerId: string }
  COMBAT_STARTED:    { zoneId: string; monsterId: string }
  COMBAT_ENDED:      { zoneId: string; victory: boolean }

  // Métiers
  SKILL_ACTION_DONE: { skillId: SkillId; actionId: string; xpGained: number; outputs: ItemDrop[] }
  SKILL_LEVEL_UP:    { skillId: SkillId; newLevel: number }
  SKILL_MILESTONE:   { skillId: SkillId; level: number; bonus: string }

  // Craft
  CRAFT_COMPLETED:   { recipeId: string; skillId: SkillId; output: ItemDrop; xpGained: number }
  CRAFT_FAILED:      { recipeId: string; reason: string }
  UPGRADE_BUILT:     { upgradeId: string; level: number }

  // Inventaire
  ITEM_ADDED:        { itemId: string; quantity: number; source: string }
  ITEM_REMOVED:      { itemId: string; quantity: number }
  ITEM_EQUIPPED:     { itemId: string; slot: SlotId }
  INVENTORY_FULL:    { itemId: string; quantityLost: number }

  // Agriculture
  PLANT_SOWED:       { plotIndex: number; seedId: string; readyAt: number }
  PLANT_READY:       { plotIndex: number; seedId: string }
  PLANT_HARVESTED:   { plotIndex: number; seedId: string; outputs: ItemDrop[]; perfect: boolean }

  // Économie
  ITEM_SOLD:         { itemId: string; quantity: number; goldGained: number }
  ITEM_BOUGHT:       { itemId: string; quantity: number; goldSpent: number }
  GOLD_CHANGED:      { delta: number; newTotal: number; source: string }

  // Quêtes
  QUEST_STARTED:     { questId: string }
  QUEST_OBJECTIVE:   { questId: string; objectiveIndex: number; current: number; target: number }
  QUEST_COMPLETED:   { questId: string; rewards: QuestReward }
  DAILY_RESET:       { date: string; newQuestIds: string[] }

  // Session
  GAME_LOADED:       { isGuest: boolean; offlineDuration: number }
  OFFLINE_RECOVERED: { duration: number; summary: OfflineSummary }
  SAVE_COMPLETED:    { target: 'local' | 'cloud' }
}

type Listener<T> = (payload: T) => void

class GameEventBus {
  private listeners = new Map<string, Set<Listener<any>>>()

  on<K extends keyof GameEventMap>(event: K, listener: Listener<GameEventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener)
    return () => this.listeners.get(event)?.delete(listener)
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.listeners.get(event)?.forEach(fn => {
      try { fn(payload) }
      catch (err) { console.error(`[EventBus] Error in ${event} listener:`, err) }
    })
  }

  clear(): void { this.listeners.clear() }
}

export const bus = new GameEventBus()
