import { bus, GameEventMap } from './event-bus'
import { GameData } from './data-loader'
import { QuestObjective, QuestProgress } from '../types/game'
import { mulberry32 } from '../lib/rng'
import rawQuests from '../quests.json'

// Interface abstraction pour le store des quêtes (à implémenter côté Zustand)
export interface QuestStore {
  getActiveQuests(): QuestProgress[]
  updateObjectiveProgress(questId: string, idx: number, newAmount: number): void
  isQuestComplete(questId: string): boolean
  markCompleted(questId: string): void
  unlockQuest(questId: string): void

  // Daily logic
  lastDailyDate: string | null
  playerSkills: Record<string, { level: number }>
  setDailyQuests(questIds: string[], date: string): void
  resetStreak(): void
  incrementStreak(): void
}

type ObjectiveHandler = (
  objective: QuestObjective,
  event: any,
  current: number
) => number

const OBJECTIVE_HANDLERS: Record<string, ObjectiveHandler> = {
  kill: (obj, event: GameEventMap['MONSTER_KILLED'], current) => {
    if ((obj as any).monsterId && (obj as any).monsterId !== event.monsterId) return current
    if ((obj as any).zoneId   && (obj as any).zoneId   !== event.zoneId)   return current
    return current + 1
  },

  gather: (obj, event: GameEventMap['SKILL_ACTION_DONE'], current) => {
    if ((obj as any).skillId && (obj as any).skillId !== event.skillId) return current
    if ((obj as any).actionId && (obj as any).actionId !== event.actionId) return current
    return current + 1
  },

  craft: (obj, event: GameEventMap['CRAFT_COMPLETED'], current) => {
    if ((obj as any).recipeId && (obj as any).recipeId !== event.recipeId) return current
    if ((obj as any).skillId  && (obj as any).skillId  !== event.skillId)  return current
    return current + event.output.qty
  },

  harvest: (obj, event: GameEventMap['PLANT_HARVESTED'], current) => current + 1,

  sell: (obj, event: GameEventMap['ITEM_SOLD'], current) => {
    if ((obj as any).itemId && (obj as any).itemId !== event.itemId) return current
    return current + event.goldGained
  },

  deliver: (obj, event: GameEventMap['ITEM_REMOVED'], current) => {
    if (event.itemId !== (obj as any).itemId) return current
    return current + event.quantity
  },

  reach_level: (obj, event: GameEventMap['SKILL_LEVEL_UP'], current) => {
    if (event.skillId !== (obj as any).skillId) return current
    return event.newLevel  // la cible est un niveau, pas un compteur
  },

  kill_boss: (obj, event: GameEventMap['MONSTER_KILLED'], current) => {
    const monster = GameData.monster(event.monsterId)
    if (monster.rarity !== 'boss') return current
    if ((obj as any).zoneId && (obj as any).zoneId !== event.zoneId) return current
    return current + 1
  },
}

export function initQuestEngine(store: QuestStore): void {
  function handleEvent(eventType: string, payload: any): void {
    const activeQuests = store.getActiveQuests()

    for (const quest of activeQuests) {
      let questUpdated = false

      quest.objectives.forEach((obj, idx) => {
        if (obj.type !== eventType) return

        // Use required to check completion if completed property does not exist in type
        if (obj.current >= obj.required) return

        const handler = OBJECTIVE_HANDLERS[obj.type]
        if (!handler) return

        const current  = obj.current ?? 0
        const newValue = handler(obj, payload, current)

        if (newValue !== current) {
          store.updateObjectiveProgress(quest.questId, idx, Math.min(newValue, obj.required))
          bus.emit('QUEST_OBJECTIVE', {
            questId: quest.questId,
            objectiveIndex: idx,
            current: Math.min(newValue, obj.required),
            target: obj.required
          })
          questUpdated = true
        }
      })

      if (questUpdated && store.isQuestComplete(quest.questId)) {
        completeQuest(quest.questId, store)
      }
    }
  }

  bus.on('MONSTER_KILLED',    p => { handleEvent('kill', p); handleEvent('kill_boss', p) })
  bus.on('SKILL_ACTION_DONE', p => handleEvent('gather', p))
  bus.on('CRAFT_COMPLETED',   p => handleEvent('craft', p))
  bus.on('PLANT_HARVESTED',   p => handleEvent('harvest', p))
  bus.on('ITEM_SOLD',         p => handleEvent('sell', p))
  bus.on('ITEM_REMOVED',      p => handleEvent('deliver', p))
  bus.on('SKILL_LEVEL_UP',    p => handleEvent('reach_level', p))
}

function completeQuest(questId: string, store: QuestStore): void {
  const quest = GameData.quest(questId)
  store.markCompleted(questId)

  // Pseudo-apply rewards, to be fleshed out with reward application system
  // applyQuestRewards(quest.rewards, store)

  if (quest.unlocks) {
    quest.unlocks.forEach((id: string) => store.unlockQuest(id))
  }
  bus.emit('QUEST_COMPLETED', { questId, rewards: quest.rewards ?? {} })
}

// ──────────────────────────────────────────────
// Daily & Weekly Generation
// ──────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 16777619)
  }
  return hash >>> 0
}

function getDailySeed(playerId: string): number {
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return dayIndex ^ hashString(playerId)
}

function getWeeklySeed(playerId: string): number {
  const weekIndex = Math.floor(Date.now() / 604_800_000)
  return weekIndex ^ hashString(playerId)
}

function isQuestAccessible(quest: any, skills: Record<string, { level: number }>): boolean {
  if (!quest.reqSkills) return true
  return Object.entries(quest.reqSkills).every(
    ([skillId, minLevel]) => (skills[skillId]?.level ?? 1) >= (minLevel as number)
  )
}

export function generateDailyQuests(
  playerId: string,
  playerSkills: Record<string, { level: number }>,
  count = 3
): string[] {
  const rng  = mulberry32(getDailySeed(playerId))
  const pool = rawQuests.dailyQuestPool.filter(q => isQuestAccessible(q, playerSkills))

  const selected: string[] = []
  const available = [...pool]
  while (selected.length < count && available.length > 0) {
    const idx = Math.floor(rng() * available.length)
    selected.push(available[idx].id)
    available.splice(idx, 1)
  }
  return selected
}

export function generateWeeklyQuest(playerId: string): string {
  const rng = mulberry32(getWeeklySeed(playerId))
  if (!rawQuests.weeklyQuests || rawQuests.weeklyQuests.length === 0) return ''
  const idx = Math.floor(rng() * rawQuests.weeklyQuests.length)
  return rawQuests.weeklyQuests[idx].id
}

export function checkDailyReset(store: QuestStore, playerId: string): void {
  const todayStr = new Date().toISOString().slice(0, 10)

  if (store.lastDailyDate === todayStr) return

  const newQuestIds = generateDailyQuests(playerId, store.playerSkills)
  store.setDailyQuests(newQuestIds, todayStr)

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (store.lastDailyDate !== yesterday) {
    store.resetStreak()
  } else {
    store.incrementStreak()
  }

  bus.emit('DAILY_RESET', { date: todayStr, newQuestIds })
}
