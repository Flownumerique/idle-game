"use client";

import { useGameStore } from "@/stores/game-store";
import { getAllZones, spawnMonster, getMonstersInZone } from "@/engine/combat-engine";
import { computePlayerStats } from "@/engine/offline-engine";
import { formatNumber } from "@/lib/formatters";
import { mulberry32 } from "@/lib/rng";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";

export default function CombatPanel() {
  const state = useGameStore((s) => s);
  const { combat, unlockedZones, startCombat, stopCombat, setAutoRestart, updateCombatState } = state;

  const zones = getAllZones().filter((z) => unlockedZones.includes(z.id));
  const playerStats = computePlayerStats(state);
  const hpPct = combat.playerHp / playerStats.maxHp;

  function handleEnterZone(zoneId: string) {
    const rng = mulberry32(Date.now());
    const zoneMonsters = getMonstersInZone(zoneId);
    const monster = spawnMonster(zoneMonsters, rng);
    updateCombatState({
      active: true,
      zoneId,
      currentMonster: monster,
      playerHitCooldown: playerStats.attackSpeed * 1000,
      monsterHitCooldown: (monster?.stats.attackSpeed ?? 2) * 1000,
    });
    startCombat(zoneId);
  }

  const recentLog = [...combat.log].reverse().slice(0, 10);

  return (
    <div className="game-card">
      <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
        <span>⚔️</span> Combat
      </h3>

      {/* Player HP */}
      <div className="mb-4">
        <ProgressBar
          value={hpPct}
          color={hpPct > 0.5 ? "bg-green-500" : hpPct > 0.25 ? "bg-yellow-500" : "bg-red-500"}
          label={`HP: ${Math.floor(combat.playerHp)} / ${playerStats.maxHp}`}
          height="h-3"
        />
      </div>

      {/* Current monster */}
      {combat.currentMonster && (
        <div className="mb-4 p-3 bg-[#0d1525] rounded border border-red-900/50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-red-300">{combat.currentMonster.name}</span>
            <span className="text-xs text-slate-400">
              {Math.floor(combat.currentMonster.hp)}/{combat.currentMonster.maxHp} HP
            </span>
          </div>
          <ProgressBar
            value={combat.currentMonster.hp / combat.currentMonster.maxHp}
            color="bg-red-600"
            height="h-2"
          />
        </div>
      )}

      {/* Zone selector */}
      {!combat.active && (
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">Sélectionner une zone :</p>
          <div className="space-y-2">
            {zones.map((zone) => (
              <div key={zone.id} className="flex justify-between items-center p-2 bg-[#0d1525] rounded border border-slate-700">
                <div>
                  <div className="text-sm font-medium text-slate-200">{zone.name}</div>
                  <div className="text-xs text-slate-400">Niveau combat requis : {zone.reqLevel?.combat ?? 1}</div>
                </div>
                <Button size="sm" onClick={() => handleEnterZone(zone.id)}>
                  Entrer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combat controls */}
      {combat.active && (
        <div className="flex gap-2 mb-4">
          <Button variant="danger" size="sm" onClick={stopCombat}>
            Fuir
          </Button>
          <Button
            variant={combat.autoRestart ? "primary" : "secondary"}
            size="sm"
            onClick={() => setAutoRestart(!combat.autoRestart)}
          >
            Auto-restart: {combat.autoRestart ? "ON" : "OFF"}
          </Button>
        </div>
      )}

      {/* Combat log */}
      <div className="bg-[#0d1525] rounded border border-slate-700 p-2 max-h-40 overflow-y-auto">
        <p className="text-xs text-slate-500 mb-1">Journal de combat</p>
        {recentLog.length === 0 ? (
          <p className="text-xs text-slate-600 italic">Aucun combat en cours</p>
        ) : (
          recentLog.map((entry, i) => (
            <div key={i} className="text-xs py-0.5">
              {entry.type === "player_hit" && (
                <span className={entry.crit ? "text-yellow-400" : "text-blue-400"}>
                  Vous infligez {entry.dmg} dégâts{entry.crit ? " ✨ CRITIQUE" : ""}
                </span>
              )}
              {entry.type === "monster_hit" && (
                <span className="text-red-400">Monstre inflige {entry.dmg} dégâts</span>
              )}
              {entry.type === "monster_death" && (
                <span className="text-green-400">Monstre vaincu !</span>
              )}
              {entry.type === "player_death" && (
                <span className="text-red-500 font-bold">Vous êtes mort...</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
