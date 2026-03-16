"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { tickSkill } from "@/engine/skill-engine";
import { tickCombat } from "@/engine/combat-engine";
import { calculateOfflineProgress, applyOfflineResult, computePlayerStats } from "@/engine/offline-engine";
import { getLevelForXp } from "@/lib/xp-calc";
import { mulberry32 } from "@/lib/rng";
import {
  AUTO_SAVE_INTERVAL_MS,
  UI_TICK_INTERVAL_MS,
  HP_REGEN_DELAY_MS,
} from "@/engine/constants";
import type { SkillId } from "@/types/game";

const SKILL_IDS: SkillId[] = [
  "woodcutting",
  "mining",
  "fishing",
  "farming",
  "smithing",
  "cooking",
  "alchemy",
];

/**
 * Main game loop hook.
 * - Calculates offline progress on mount
 * - Runs RAF-based game tick
 * - Updates UI progress bars at 250ms intervals
 * - Auto-saves every 30s
 */
export function useGameLoop() {
  const store = useGameStore;
  const lastTickRef = useRef<number>(Date.now());
  const lastSaveRef = useRef<number>(Date.now());
  const lastCombatEndRef = useRef<number>(0);
  const rngRef = useRef<() => number>(mulberry32(Date.now()));
  const rafRef = useRef<number>(0);
  const uiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Offline progress on mount ──
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.player.name === "") return; // not created yet
    const now = Date.now();
    const elapsed = now - state.lastSaveAt;
    if (elapsed > 60_000) {
      const result = calculateOfflineProgress(state, now);
      const newState = applyOfflineResult(state, result);
      useGameStore.setState(newState);
      // Store offline result for display (could use a separate UI store)
      (window as unknown as Record<string, unknown>).__offlineResult = result;
    }
    lastTickRef.current = now;
    lastSaveRef.current = now;
    rngRef.current = mulberry32(now);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── RAF game tick ──
  useEffect(() => {
    function tick(timestamp: number) {
      const now = timestamp;
      const deltaMs = now - lastTickRef.current;
      lastTickRef.current = now;

      const state = useGameStore.getState();
      if (state.player.name === "") {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const updates: Partial<ReturnType<typeof useGameStore.getState>> = {};
      const newSkills = { ...state.skills };
      const newInventory = { ...state.inventory };
      let newGold = state.gold;

      // ── Skill ticks ──
      for (const skillId of SKILL_IDS) {
        const skillState = state.skills[skillId];
        if (!skillState.activeAction) continue;

        const result = tickSkill(
          skillId,
          skillState,
          state.equipment,
          deltaMs,
          rngRef.current() * 0xffffffff,
          false
        );

        if (result.actionsCompleted > 0) {
          const oldXp = skillState.xp;
          const newXp = oldXp + result.xpGained;
          newSkills[skillId] = {
            ...skillState,
            xp: newXp,
            level: getLevelForXp(newXp),
          };
          for (const [itemId, qty] of Object.entries(result.loot)) {
            newInventory[itemId] = (newInventory[itemId] ?? 0) + qty;
          }
        }
      }

      // ── Combat tick ──
      if (state.combat.active && state.combat.zoneId && state.combat.currentMonster) {
        const playerStats = computePlayerStats(state);
        const shield = state.equipment["shield"];
        // Get block chance from equipped shield
        const getBlockChance = () => 0; // TODO: read from items data
        const result = tickCombat(
          state.combat,
          playerStats,
          state.combat.playerHp,
          deltaMs,
          rngRef.current,
          getBlockChance
        );
        updates.combat = result.newCombatState;
        for (const [itemId, qty] of Object.entries(result.loot)) {
          newInventory[itemId] = (newInventory[itemId] ?? 0) + qty;
        }
        newGold += result.goldGained;
        if (!result.newCombatState.active) {
          lastCombatEndRef.current = now;
        }
      } else if (!state.combat.active) {
        // HP regen out of combat
        const timeSinceCombatEnd = now - lastCombatEndRef.current;
        if (timeSinceCombatEnd > HP_REGEN_DELAY_MS) {
          const playerStats = computePlayerStats(state);
          const regenAmount = playerStats.hpRegen * (deltaMs / 1000);
          const newHp = Math.min(
            playerStats.maxHp,
            state.combat.playerHp + regenAmount
          );
          updates.combat = { ...state.combat, playerHp: newHp };
        }
      }

      // ── Apply updates ──
      useGameStore.setState({
        skills: newSkills,
        inventory: newInventory,
        gold: newGold,
        ...updates,
      });

      // ── Auto-save ──
      if (now - lastSaveRef.current > AUTO_SAVE_INTERVAL_MS) {
        lastSaveRef.current = now;
        useGameStore.setState({ lastSaveAt: now });
        // Zustand persist middleware handles localStorage automatically
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── UI progress bar updates at 250ms ──
  useEffect(() => {
    uiIntervalRef.current = setInterval(() => {
      const state = useGameStore.getState();
      const now = Date.now();
      const newSkills = { ...state.skills };
      let updated = false;

      for (const skillId of SKILL_IDS) {
        const skillState = state.skills[skillId];
        if (!skillState.activeAction || !skillState.actionStartedAt) continue;

        // Compute progress of current action
        const elapsed = now - skillState.actionStartedAt;
        // Action duration approximation for UI
        const progress = Math.min(1, (elapsed % 4000) / 4000);
        if (Math.abs(progress - skillState.actionProgress) > 0.01) {
          newSkills[skillId] = { ...skillState, actionProgress: progress };
          updated = true;
        }
      }

      if (updated) {
        useGameStore.setState({ skills: newSkills });
      }
    }, UI_TICK_INTERVAL_MS);

    return () => {
      if (uiIntervalRef.current) clearInterval(uiIntervalRef.current);
    };
  }, []);
}
