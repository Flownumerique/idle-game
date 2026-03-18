"use client";

import { useGameStore } from "@/stores/game-store";
import { computePlayerStats } from "@/engine/offline-engine";
import type { SkillId } from "@/types/game";
import ProgressBar from "@/components/ui/ProgressBar";
import { getLevelProgress, getXpForLevel, getXpToNextLevel } from "@/lib/xp-calc";
import { SKILL_IDS } from "@/types/game";

const COMBAT_SKILLS = SKILL_IDS.filter((id) =>
  [
    "attack",
    "strength",
    "ranged",
    "magic",
    "defense",
    "dodge",
    "constitution",
    "prayer",
  ].includes(id)
);

const SKILL_ICONS: Record<string, string> = {
  attack: "⚔️",
  strength: "💪",
  ranged: "🏹",
  magic: "✨",
  defense: "🛡️",
  dodge: "💨",
  constitution: "❤️",
  prayer: "🙏",
};

export default function CharacterSheet() {
  const { player, skills } = useGameStore((s) => ({
    player: s.player,
    skills: s.skills,
  }));

  // We compute stats on the fly for the sheet
  const state = useGameStore();
  const stats = computePlayerStats(state);

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="game-card flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-400">{player.name}</h2>
          <p className="text-sm text-slate-400 capitalize">Classe: {player.playerClass}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Niveau de Combat</div>
          <div className="text-2xl font-bold text-slate-200">
            {/* simple combat level formula for display */}
            {Math.floor(
              ((skills.defense?.level || 1) + (skills.constitution?.level || 1) + Math.floor((skills.prayer?.level || 1) / 2)) * 0.25 +
              Math.max(
                (skills.attack?.level || 1) + (skills.strength?.level || 1),
                (skills.magic?.level || 1) * 1.5,
                (skills.ranged?.level || 1) * 1.5
              ) * 0.325
            )}
          </div>
        </div>
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
            {COMBAT_SKILLS.map((skillId) => {
              const skill = skills[skillId] || { level: 1, xp: 0 }; // Fallback for old saves
              const progress = getLevelProgress(skill.xp);

              return (
                <div key={skillId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 capitalize text-slate-300">
                      <span>{SKILL_ICONS[skillId]}</span>
                      {skillId}
                    </span>
                    <span className="font-bold text-slate-200">Lvl. {skill.level}</span>
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
