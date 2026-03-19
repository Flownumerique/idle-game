"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  GameState,
  SkillId,
  SlotId,
  PlayerClass,
  FarmPlot,
  QuestProgress,
} from "@/types/game";
import { PROFESSION_SKILL_IDS } from "@/types/game";
import { getLevelForXp } from "@/lib/xp-calc";

// ──────────────────────────────────────────────
// Default / initial state
// ──────────────────────────────────────────────

const DEFAULT_SKILL_STATE = {
  level: 1,
  xp: 0,
  activeAction: null,
  actionStartedAt: null,
  actionProgress: 0,
};

function defaultGameState(): GameState {
  return {
    player: {
      id: "",
      name: "",
      playerClass: "warrior" as PlayerClass,
      createdAt: Date.now(),
    },
    skills: {
      woodcutting: { ...DEFAULT_SKILL_STATE },
      mining: { ...DEFAULT_SKILL_STATE },
      fishing: { ...DEFAULT_SKILL_STATE },
      farming: { ...DEFAULT_SKILL_STATE },
      smithing: { ...DEFAULT_SKILL_STATE },
      cooking: { ...DEFAULT_SKILL_STATE },
      alchemy: { ...DEFAULT_SKILL_STATE },
      attack: { ...DEFAULT_SKILL_STATE },
      strength: { ...DEFAULT_SKILL_STATE },
      ranged: { ...DEFAULT_SKILL_STATE },
      magic: { ...DEFAULT_SKILL_STATE },
      defense: { ...DEFAULT_SKILL_STATE },
      dodge: { ...DEFAULT_SKILL_STATE },
      constitution: { ...DEFAULT_SKILL_STATE, level: 10, xp: 1154 }, // start with 10 const -> 200 hp (assuming 100+10*10)
      prayer: { ...DEFAULT_SKILL_STATE },
    },
    inventory: {},
    equipment: {
      head: null,
      chest: null,
      legs: null,
      hands: null,
      feet: null,
      mainhand: null,
      offhand: null,
      neck: null,
      ring1: null,
      ring2: null,
      cape: null,
      tool_woodcutting: null,
      tool_mining: null,
      tool_fishing: null,
    },
    inventoryMax: 100,
    gold: 0,
    combat: {
      active: false,
      zoneId: null,
      currentMonster: null,
      playerHp: 110,
      playerHitCooldown: 2400,
      monsterHitCooldown: 2000,
      autoRestart: true,
      trainingStyle: "attack",
      log: [],
    },
    farmPlots: [
      { seedId: null, plantedAt: null, readyAt: null },
    ],
    upgrades: {},
    unlockedZones: ["plains_start"],
    unlockedFlags: [],
    quests: {},
    dailyQuestIds: [],
    weeklyQuestId: null,
    lastDailyReset: Date.now(),
    lastWeeklyReset: Date.now(),
    marketSales: {},
    discoveredItems: [],
    lastSaveAt: Date.now(),
    totalPlayTime: 0,
    version: 1,
  };
}

// ──────────────────────────────────────────────
// Store actions
// ──────────────────────────────────────────────

interface GameActions {
  // Character creation
  createCharacter: (name: string, playerClass: PlayerClass) => void;

  // Skill actions
  startAction: (skillId: SkillId, actionId: string) => void;
  stopAction: (skillId: SkillId) => void;
  addSkillXp: (skillId: SkillId, xp: number) => void;
  setSkillLevel: (skillId: SkillId, level: number) => void;

  // Inventory
  addItems: (items: Record<string, number>) => void;
  removeItems: (items: Record<string, number>) => boolean;
  equipItem: (itemId: string, slot: SlotId) => void;
  unequipItem: (slot: SlotId) => void;

  // Gold
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;

  // Combat
  startCombat: (zoneId: string) => void;
  stopCombat: () => void;
  setAutoRestart: (enabled: boolean) => void;
  updateCombatState: (update: Partial<GameState["combat"]>) => void;
  updatePlayerHp: (hp: number) => void;

  // Farming
  plantSeed: (plotIndex: number, seedId: string, growthTimeMs: number) => void;
  harvestPlot: (plotIndex: number) => void;

  // Upgrades & flags
  applyUpgrade: (upgradeId: string) => void;
  unlockZone: (zoneId: string) => void;
  setFlag: (flag: string) => void;

  // Quest progress
  updateQuestProgress: (questId: string, update: Partial<QuestProgress>) => void;

  // Market
  recordSale: (itemId: string, quantity: number) => void;

  // Meta
  setSaveTime: (ts: number) => void;
  addPlayTime: (ms: number) => void;

  // Full state replacement (for offline progress apply / save load)
  hydrateState: (state: Partial<GameState>) => void;

  // Reset game (new character)
  resetGame: () => void;
}

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...defaultGameState(),

      createCharacter: (name, playerClass) => {
        set((s) => ({
          player: { ...s.player, id: crypto.randomUUID(), name, playerClass, createdAt: Date.now() },
          // Apply class bonuses to upgrades record as permanent flags
          upgrades: {
            ...s.upgrades,
            [`class_bonus_${playerClass}`]: 1,
          },
        }));
      },

      startAction: (skillId, actionId) =>
        set((s) => {
          // Stop any other active profession skill first
          const updatedSkills = { ...s.skills };
          for (const id of PROFESSION_SKILL_IDS) {
            if (id !== skillId && updatedSkills[id].activeAction) {
              updatedSkills[id] = {
                ...updatedSkills[id],
                activeAction: null,
                actionStartedAt: null,
                actionProgress: 0,
              };
            }
          }
          updatedSkills[skillId] = {
            ...updatedSkills[skillId],
            activeAction: actionId,
            actionStartedAt: Date.now(),
            actionProgress: 0,
          };
          return { skills: updatedSkills };
        }),

      stopAction: (skillId) =>
        set((s) => ({
          skills: {
            ...s.skills,
            [skillId]: {
              ...s.skills[skillId],
              activeAction: null,
              actionStartedAt: null,
              actionProgress: 0,
            },
          },
        })),

      addSkillXp: (skillId, xp) =>
        set((s) => {
          const skill = s.skills[skillId];
          const newXp = skill.xp + xp;
          const newLevel = getLevelForXp(newXp);
          return {
            skills: {
              ...s.skills,
              [skillId]: { ...skill, xp: newXp, level: newLevel },
            },
          };
        }),

      setSkillLevel: (skillId, level) =>
        set((s) => ({
          skills: {
            ...s.skills,
            [skillId]: { ...s.skills[skillId], level },
          },
        })),

      addItems: (items) =>
        set((s) => {
          const inv = { ...s.inventory };
          let discoveredSet: Set<string> | null = null;
          
          for (const [id, qty] of Object.entries(items)) {
            inv[id] = (inv[id] ?? 0) + qty;
            if (!s.discoveredItems.includes(id)) {
              if (!discoveredSet) discoveredSet = new Set(s.discoveredItems);
              discoveredSet.add(id);
            }
          }
          
          if (discoveredSet) {
            return { inventory: inv, discoveredItems: Array.from(discoveredSet) };
          }
          return { inventory: inv };
        }),

      removeItems: (items) => {
        const s = get();
        for (const [id, qty] of Object.entries(items)) {
          if ((s.inventory[id] ?? 0) < qty) return false;
        }
        set((s) => {
          const inv = { ...s.inventory };
          for (const [id, qty] of Object.entries(items)) {
            inv[id] = (inv[id] ?? 0) - qty;
            if (inv[id] <= 0) delete inv[id];
          }
          return { inventory: inv };
        });
        return true;
      },

      equipItem: (itemId, slot) =>
        set((s) => ({
          equipment: { ...s.equipment, [slot]: itemId },
        })),

      unequipItem: (slot) =>
        set((s) => ({
          equipment: { ...s.equipment, [slot]: null },
        })),

      addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

      spendGold: (amount) => {
        if (get().gold < amount) return false;
        set((s) => ({ gold: s.gold - amount }));
        return true;
      },

      startCombat: (zoneId) =>
        set((s) => ({
          combat: {
            ...s.combat,
            active: true,
            zoneId,
          },
        })),

      stopCombat: () =>
        set((s) => ({
          combat: { ...s.combat, active: false, currentMonster: null },
        })),

      setAutoRestart: (enabled) =>
        set((s) => ({
          combat: { ...s.combat, autoRestart: enabled },
        })),

      updateCombatState: (update) =>
        set((s) => ({
          combat: { ...s.combat, ...update },
        })),

      updatePlayerHp: (hp) =>
        set((s) => ({
          combat: { ...s.combat, playerHp: hp },
        })),

      plantSeed: (plotIndex, seedId, growthTimeMs) =>
        set((s) => {
          const plots = [...s.farmPlots];
          const now = Date.now();
          plots[plotIndex] = { seedId, plantedAt: now, readyAt: now + growthTimeMs };
          return { farmPlots: plots };
        }),

      harvestPlot: (plotIndex) =>
        set((s) => {
          const plots = [...s.farmPlots];
          plots[plotIndex] = { seedId: null, plantedAt: null, readyAt: null };
          return { farmPlots: plots };
        }),

      applyUpgrade: (upgradeId) =>
        set((s) => ({
          upgrades: {
            ...s.upgrades,
            [upgradeId]: (s.upgrades[upgradeId] ?? 0) + 1,
          },
        })),

      unlockZone: (zoneId) =>
        set((s) => ({
          unlockedZones: s.unlockedZones.includes(zoneId)
            ? s.unlockedZones
            : [...s.unlockedZones, zoneId],
        })),

      setFlag: (flag) =>
        set((s) => ({
          unlockedFlags: s.unlockedFlags.includes(flag)
            ? s.unlockedFlags
            : [...s.unlockedFlags, flag],
        })),

      updateQuestProgress: (questId, update) =>
        set((s) => ({
          quests: {
            ...s.quests,
            [questId]: { ...(s.quests[questId] ?? {}), ...update } as QuestProgress,
          },
        })),

      recordSale: (itemId, quantity) =>
        set((s) => {
          const now = Date.now();
          const existing = s.marketSales[itemId];
          const windowStart = existing && now - existing.windowStart < 30 * 60 * 1000
            ? existing.windowStart
            : now;
          const count = (windowStart === existing?.windowStart ? existing.count : 0) + quantity;
          return {
            marketSales: { ...s.marketSales, [itemId]: { count, windowStart } },
          };
        }),

      setSaveTime: (ts) => set({ lastSaveAt: ts }),

      addPlayTime: (ms) => set((s) => ({ totalPlayTime: s.totalPlayTime + ms })),

      hydrateState: (partial) => set((s) => ({ ...s, ...partial })),

      resetGame: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("idle-realms-save");
        }
        set(defaultGameState());
      },
    }),
    {
      name: "idle-realms-save",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      // Only persist the game state fields, not actions
      partialize: (s) => ({
        player: s.player,
        skills: s.skills,
        inventory: s.inventory,
        equipment: s.equipment,
        inventoryMax: s.inventoryMax,
        gold: s.gold,
        combat: s.combat,
        farmPlots: s.farmPlots,
        upgrades: s.upgrades,
        unlockedZones: s.unlockedZones,
        unlockedFlags: s.unlockedFlags,
        quests: s.quests,
        dailyQuestIds: s.dailyQuestIds,
        weeklyQuestId: s.weeklyQuestId,
        lastDailyReset: s.lastDailyReset,
        lastWeeklyReset: s.lastWeeklyReset,
        marketSales: s.marketSales,
        discoveredItems: s.discoveredItems,
        lastSaveAt: s.lastSaveAt,
        totalPlayTime: s.totalPlayTime,
        version: s.version,
      }),
    }
  )
);
