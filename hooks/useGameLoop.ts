"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/stores/game-store";
import { bus } from "@/engine/event-bus";
import { tickSkill, getAction, getActionDurationMs, getToolBonus } from "@/engine/skill-engine";
import { tickCombat } from "@/engine/combat-engine";
import { calculateOfflineProgress, applyOfflineResult, computePlayerStats } from "@/engine/offline-engine";
import { getLevelForXp } from "@/lib/xp-calc";
import { mulberry32 } from "@/lib/rng";
import {
  AUTO_SAVE_INTERVAL_MS,
  UI_TICK_INTERVAL_MS,
  HP_REGEN_DELAY_MS,
} from "@/engine/constants";
import { SKILL_IDS } from "@/types/game";

/**
 * Main game loop hook.
 * - Calculates offline progress on mount
 * - Runs RAF-based game tick with per-skill time accumulator (fixes XP at 60fps)
 * - Updates UI progress bars at 250ms intervals
 * - Auto-saves every 30s
 */
export function useGameLoop() {
  const lastTickRef = useRef<number>(Date.now());
  const lastSaveRef = useRef<number>(Date.now());
  const lastCombatEndRef = useRef<number>(0);
  const rngRef = useRef<() => number>(mulberry32(Date.now()));
  const rafRef = useRef<number>(0);
  const uiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Accumulates delta time per skill so full action cycles are detected correctly
  const skillAccRef = useRef<Partial<Record<string, { actionId: string; acc: number }>>>({});

  // ── Offline progress on mount ──
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.player.name === "") return; // not created yet
    // ── Pre-sync discovered items with inventory & equipment ──
    const discoveredSet = new Set(state.discoveredItems || []);
    let discoveredUpdatedInitial = false;
    const mark = (id: string | null | undefined) => {
      if (id && !discoveredSet.has(id)) {
        discoveredSet.add(id);
        discoveredUpdatedInitial = true;
      }
    };
    Object.keys(state.inventory).forEach(mark);
    Object.values(state.equipment).forEach(mark);
    if (discoveredUpdatedInitial) {
      useGameStore.setState({ discoveredItems: Array.from(discoveredSet) });
    }

    const now = Date.now();
    const elapsed = now - state.lastSaveAt;
    if (elapsed > 60_000) {
      const result = calculateOfflineProgress(state, now);
      const newState = applyOfflineResult(state, result);
      useGameStore.setState(newState);
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

      let discoveredUpdated = false;
      const discoveredSet = new Set(state.discoveredItems || []);
      const markDiscovered = (itemId: string) => {
        if (!discoveredSet.has(itemId)) {
          discoveredSet.add(itemId);
          discoveredUpdated = true;
        }
      };

      // ── Skill ticks ──
      for (const skillId of SKILL_IDS) {
        const skillState = state.skills[skillId];
        if (!skillState?.activeAction) {
          delete skillAccRef.current[skillId];
          continue;
        }

        // Accumulate time; reset accumulator when the active action changes
        const current = skillAccRef.current[skillId];
        if (!current || current.actionId !== skillState.activeAction) {
          skillAccRef.current[skillId] = { actionId: skillState.activeAction, acc: deltaMs };
        } else {
          current.acc += deltaMs;
        }
        const accMs = skillAccRef.current[skillId]!.acc;

        const action = getAction(skillId, skillState.activeAction);
        const durationMs = action ? getActionDurationMs(action, getToolBonus(state.equipment, skillId)) : 1000;
        const potentialCount = Math.floor(accMs / durationMs);

        const result = tickSkill(
          skillId,
          skillState,
          newInventory, // newInventory contains current state
          state.equipment,
          accMs,
          rngRef.current() * 0xffffffff,
          false
        );

        if (potentialCount > 0 && result.actionsCompleted === 0 && action?.inputs) {
          // Stopped due to missing ingredients
          newSkills[skillId] = {
            ...newSkills[skillId],
            activeAction: null,
            actionStartedAt: null,
            actionProgress: 0,
          };
          delete skillAccRef.current[skillId];
          continue;
        }

        if (result.actionsCompleted > 0) {
          const newXp = skillState.xp + result.xpGained;
          newSkills[skillId] = {
            ...skillState,
            xp: newXp,
            level: getLevelForXp(newXp),
          };
          for (const [itemId, qty] of Object.entries(result.loot)) {
            newInventory[itemId] = (newInventory[itemId] ?? 0) + qty;
            markDiscovered(itemId);
          }
          
          // Consume inputs
          for (const [itemId, qty] of Object.entries(result.consumed)) {
            newInventory[itemId] = Math.max(0, (newInventory[itemId] ?? 0) - qty);
          }

          // Keep remainder
          if (action) {
            skillAccRef.current[skillId]!.acc = accMs % durationMs;
          }
        }
      }

      // ── Combat tick ──
      if (state.combat.active && state.combat.zoneId && state.combat.currentMonster) {
        const playerStats = computePlayerStats(state);
        const result = tickCombat(
          state.combat,
          playerStats,
          state.combat.playerHp,
          deltaMs,
          rngRef.current
        );
        updates.combat = result.newCombatState;

        // Track regular monster kills per zone
        if (result.monstersKilled > 0 && state.combat.zoneId) {
          const zid = state.combat.zoneId;
          updates.zoneKills = {
            ...state.zoneKills,
            [zid]: (state.zoneKills[zid] ?? 0) + result.monstersKilled,
          };
        }

        if (result.bossKilledId) {
          useGameStore.getState().setFlag(`boss_killed_${result.bossKilledId}`);
          bus.emit('MONSTER_KILLED', {
            monsterId: result.bossKilledId,
            zoneId:    state.combat.zoneId ?? '',
            loot:      Object.entries(result.loot).map(([itemId, qty]) => ({ itemId, qty })),
            xpGained:  result.xpGained,
          });
        }

        if (result.xpGained > 0) {
           const style = updates.combat.trainingStyle ?? "attack";
           const currentXp = newSkills[style].xp + result.xpGained;
           newSkills[style] = {
             ...newSkills[style],
             xp: currentXp,
             level: getLevelForXp(currentXp)
           };
           const constXp = newSkills["constitution"].xp + Math.max(1, Math.floor(result.xpGained / 3));
           newSkills["constitution"] = {
             ...newSkills["constitution"],
             xp: constXp,
             level: getLevelForXp(constXp)
           };
        }

        for (const [itemId, qty] of Object.entries(result.loot)) {
          newInventory[itemId] = (newInventory[itemId] ?? 0) + qty;
          markDiscovered(itemId);
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

      if (discoveredUpdated) {
        updates.discoveredItems = Array.from(discoveredSet);
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
      const newSkills = { ...state.skills };
      let updated = false;

      for (const skillId of SKILL_IDS) {
        const skillState = state.skills[skillId];
        if (!skillState?.activeAction) continue;

        const acc = skillAccRef.current[skillId];
        if (!acc) continue;

        const action = getAction(skillId, skillState.activeAction);
        if (!action) continue;

        const durationMs = getActionDurationMs(action, getToolBonus(state.equipment, skillId));
        const progress = Math.min(1, acc.acc / durationMs);

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
