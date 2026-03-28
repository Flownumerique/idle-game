import { calculateOfflineProgress, applyOfflineResult } from '../engine/offline-engine'
import * as CONSTANTS from '../engine/constants'
import { GameState } from '../types/game'

// Basic default mock state builder for testing
function makeDefaultGameState(): GameState {
  return {
    player: { id: 'test', name: 'Tester', playerClass: 'warrior', createdAt: Date.now() },
    skills: {
      woodcutting: { level: 1, xp: 0, activeAction: 'cut_common', actionStartedAt: Date.now(), actionProgress: 0 },
      mining: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      fishing: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      planting: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      farming: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      smithing: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      cooking: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      alchemy: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      attack: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      strength: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      ranged: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      magic: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      defense: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      dodge: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      constitution: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
      prayer: { level: 1, xp: 0, activeAction: null, actionStartedAt: null, actionProgress: 0 },
    },
    inventory: {},
    equipment: {
      head: null, chest: null, legs: null, hands: null, feet: null, mainhand: null, offhand: null, neck: null, ring1: null, ring2: null, cape: null,
      tool_woodcutting: null, tool_mining: null, tool_fishing: null,
    },
    inventoryMax: 30,
    gold: 0,
    combat: {
      active: true,
      zoneId: 'z1_forest',
      currentMonster: null,
      playerHp: 100,
      playerHitCooldown: 0,
      monsterHitCooldown: 0,
      autoRestart: true,
      trainingStyle: 'attack' as any,
      log: [],
    },
    plantPlots: [],
    farmingSpots: [],
    upgrades: {},
    unlockedZones: ['plains_start'],
    unlockedFlags: [],
    zoneKills: {},
    quests: {},
    dailyQuestIds: [],
    weeklyQuestId: null,
    lastDailyReset: 0,
    lastWeeklyReset: 0,
    activeCraft: null,
    activeBuffs: [],
    marketSales: {},
    discoveredItems: [],
    synergyState: {},
    lastSaveAt: Date.now(),
    totalPlayTime: 0,
    version: 3,
    gameLogs: [],
  }
}

interface BalanceReport {
  xp: Record<string, Record<number, number>>
  economy: Record<string, number>
  combat: Record<string, { survivalRate: number, potionsPerHour: number }>
  craft: Record<string, any>
}

const SIMULATION_HOURS = 100

async function runBalanceSimulation() {
  let store = makeDefaultGameState()
  const report: BalanceReport = { xp: {}, economy: {}, combat: {}, craft: {} }
  const xpLog: Record<string, boolean[]> = {}

  for (let h = 0; h < SIMULATION_HOURS; h++) {
    const deltaMs = 3600_000
    const result = calculateOfflineProgress(store, store.lastSaveAt + deltaMs)
    store = applyOfflineResult(store, result)

    // Track level reaching time
    for (const [skillId, skillState] of Object.entries(store.skills)) {
      if (!report.xp[skillId]) report.xp[skillId] = {}
      if (!xpLog[skillId]) xpLog[skillId] = []

      const level = skillState.level

      if (level >= 10 && !xpLog[skillId][10]) { report.xp[skillId][10] = h + 1; xpLog[skillId][10] = true }
      if (level >= 50 && !xpLog[skillId][50]) { report.xp[skillId][50] = h + 1; xpLog[skillId][50] = true }
      if (level >= 99 && !xpLog[skillId][99]) { report.xp[skillId][99] = h + 1; xpLog[skillId][99] = true }
    }

    if (h % 10 === 0) {
      // Snapshot could be used here
    }
  }

  printReport(report)
}

function printReport(report: BalanceReport): void {
  console.log('\n=== IDLE REALMS — BALANCE REPORT ===')

  console.log('\n📈 XP PROGRESSION (heures pour atteindre le niveau)')
  for (const [skillId, timeline] of Object.entries(report.xp)) {
    if (Object.keys(timeline).length === 0) continue
    const v10 = timeline[10] ? timeline[10].toFixed(1) + 'h' : '-'
    const v50 = timeline[50] ? timeline[50].toFixed(1) + 'h' : '-'
    const v99 = timeline[99] ? timeline[99].toFixed(1) + 'h' : '-'
    console.log(`  ${skillId.padEnd(15)} | niv.10: ${v10} | niv.50: ${v50} | niv.99: ${v99}`)
  }
}

// Check if run directly
if (typeof require !== 'undefined' && require.main === module) {
  runBalanceSimulation().catch(console.error)
}

export { runBalanceSimulation }
