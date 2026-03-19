"use client";

import { useGameStore } from "@/stores/game-store";
import { formatNumber } from "@/lib/formatters";
import { calculateGlobalLevels } from "@/lib/xp-calc";

export default function ResourceBar() {
  const { player, gold, skills } = useGameStore((s) => ({
    player: s.player,
    gold: s.gold,
    skills: s.skills,
  }));

  const { totalLevel } = calculateGlobalLevels(skills);

  // Count active skills
  const activeSkills = Object.values(skills).filter((s) => s.activeAction).length;

  return (
    <div className="bg-[#16213e] border-b border-[#0f3460] px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gold">⚔️ Idle Realms</span>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">👤</span>
          <span className="text-slate-200 font-medium">{player.name}</span>
          <span className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
            Niv. {totalLevel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-yellow-400">🪙</span>
          <span className="text-gold font-bold">{formatNumber(gold)}</span>
        </div>

        {activeSkills > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs">{activeSkills} métier{activeSkills > 1 ? "s" : ""} actif{activeSkills > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
