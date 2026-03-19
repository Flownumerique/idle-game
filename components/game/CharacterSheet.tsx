"use client";

import { useGameStore } from "@/stores/game-store";
import { computePlayerStats } from "@/engine/offline-engine";
import { getLevelProgress, getLevelForXp, calculateGlobalLevels } from "@/lib/xp-calc";
import { getNextMilestone } from "@/engine/milestone-engine";
import { COMBAT_SKILL_IDS } from "@/types/game";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";

export default function CharacterSheet() {
  const { player, skills, resetGame } = useGameStore((s) => ({
    player: s.player,
    skills: s.skills,
    resetGame: s.resetGame,
  }));

  const state = useGameStore();
  const stats = computePlayerStats(state);
  const { totalLevel, combatLevel, professionLevel } = calculateGlobalLevels(skills);
  const nextMilestone = getNextMilestone(state);

  function handleReset() {
    if (window.confirm("Créer un nouveau personnage ? La sauvegarde actuelle sera effacée.")) {
      resetGame();
    }
  }

  return (
    <div className="space-y-6">
      {/* Identity & Global Levels */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-amber-400">{player.name}</h2>
            <p className="text-sm text-slate-400 capitalize">Classe: {player.playerClass}</p>
          </div>
          <Button variant="danger" size="sm" onClick={handleReset}>
            Nouveau personnage
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-slate-700/50 py-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Niveau Global</div>
            <div className="text-3xl font-black text-white">{totalLevel}</div>
          </div>
          <div className="text-center border-x border-slate-700/30">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Martial</div>
            <div className="text-2xl font-bold text-red-400">{combatLevel}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Métiers</div>
            <div className="text-2xl font-bold text-cyan-400">{professionLevel}</div>
          </div>
        </div>

        {nextMilestone && (
          <div className="mt-2 pt-4 border-t border-slate-700/30">
            <div className="flex justify-between items-end mb-1.5">
              <div className="text-xs text-slate-400">
                Prochain objectif : <span className="text-amber-300 font-medium">{nextMilestone.label}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {totalLevel} / {nextMilestone.level}
              </div>
            </div>
            <ProgressBar
              value={totalLevel / nextMilestone.level}
              height="h-1.5"
              color="bg-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1.5 italic">
              "{nextMilestone.description}"
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Derived Stats */}
        <div className="game-card">
          <h3 className="font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">Attributs de Combat</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Style Actif</span>
              <span className="font-medium text-amber-300 capitalize">{stats.activeStyle || "Mains Nues"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Points de Vie (Max)</span>
              <span className="font-medium text-green-400">{Math.floor(stats.maxHp)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Régénération HP</span>
              <span className="font-medium text-green-300">{stats.hpRegen.toFixed(1)} /s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Puissance d'Attaque</span>
              <span className="font-medium text-red-400">{Math.floor(stats.attack)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Vitesse d'Attaque</span>
              <span className="font-medium text-yellow-200">{stats.attackSpeed.toFixed(2)}s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Chances de Critique</span>
              <span className="font-medium text-purple-400">{(stats.critChance * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Armure (Défense)</span>
              <span className="font-medium text-blue-400">{Math.floor(stats.defense)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Chances d'Esquive</span>
              <span className="font-medium text-cyan-400">{(stats.dodgeChance * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Combat Skills Levels */}
        <div className="game-card">
          <h3 className="font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">Niveaux Martiaux</h3>
          <div className="space-y-4">
            {COMBAT_SKILL_IDS.map((skillId) => {
              const skill = skills[skillId] || { level: 1, xp: 0 };
              const level = getLevelForXp(skill.xp);
              const progress = getLevelProgress(skill.xp);
              return (
                <div key={skillId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 capitalize text-slate-300">
                      {skillId}
                    </span>
                    <span className="font-bold text-slate-200">Lvl. {level}</span>
                  </div>
                  <ProgressBar
                    value={progress}
                    height="h-1.5"
                    color={
                      skillId === "constitution" ? "bg-red-500" :
                      skillId === "magic" ? "bg-purple-500" :
                      skillId === "ranged" ? "bg-green-500" :
                      skillId === "defense" ? "bg-blue-500" :
                      "bg-amber-500"
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
