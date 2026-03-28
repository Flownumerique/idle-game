"use client";

import { useGameStore } from "@/stores/game-store";
import { getAvailableActions, getActionDurationMs, getToolBonus } from "@/engine/skill-engine";
import { getLevelForXp, getLevelProgress, getXpForLevel, getXpToNextLevel } from "@/lib/xp-calc";
import { formatNumber } from "@/lib/formatters";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import type { SkillId } from "@/types/game";

const SKILL_LABELS: Record<SkillId, { name: string; icon: string }> = {
  woodcutting: { name: "Bûcheronnage", icon: "🌲" },
  mining: { name: "Minage", icon: "⛏️" },
  fishing: { name: "Pêche", icon: "🎣" },
  planting: { name: "Plantation", icon: "🌱" },
  farming: { name: "Agriculture", icon: "🌾" },
  smithing: { name: "Forge", icon: "🔨" },
  cooking: { name: "Cuisine", icon: "🍳" },
  alchemy: { name: "Alchimie", icon: "⚗️" },
  attack: { name: "Attaque", icon: "⚔️" },
  strength: { name: "Force", icon: "💪" },
  ranged: { name: "Distance", icon: "🏹" },
  magic: { name: "Magie", icon: "✨" },
  defense: { name: "Défense", icon: "🛡️" },
  dodge: { name: "Esquive", icon: "💨" },
  constitution: { name: "Constitution", icon: "❤️" },
  prayer: { name: "Prière", icon: "🙏" },
};

interface SkillPanelProps {
  skillId: SkillId;
}

export default function SkillPanel({ skillId }: SkillPanelProps) {
  const { skillState, equipment, startAction, stopAction } = useGameStore((s) => ({
    skillState: s.skills[skillId],
    equipment: s.equipment,
    startAction: s.startAction,
    stopAction: s.stopAction,
  }));

  const level = getLevelForXp(skillState.xp);
  const xpProgress = getLevelProgress(skillState.xp);
  const xpToNext = getXpToNextLevel(level);
  const xpInLevel = skillState.xp - getXpForLevel(level);

  const availableActions = getAvailableActions(skillId, level);
  const toolBonus = getToolBonus(equipment, skillId);
  const label = SKILL_LABELS[skillId];

  function handleActionClick(actionId: string) {
    if (skillState.activeAction === actionId) {
      stopAction(skillId);
    } else {
      startAction(skillId, actionId);
    }
  }

  return (
    <div className="game-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{label.icon}</span>
          <div>
            <h3 className="font-bold text-slate-200">{label.name}</h3>
            <span className="text-xs text-slate-400">Niveau {level}</span>
          </div>
        </div>
        {skillState.activeAction && (
          <span className="text-xs text-green-400">● Actif</span>
        )}
      </div>

      {/* XP bar */}
      <div className="mb-3">
        <ProgressBar
          value={xpProgress}
          color="bg-cyan-500"
          label={`XP: ${formatNumber(xpInLevel)} / ${formatNumber(xpToNext)}`}
        />
      </div>

      {/* Actions list */}
      <div className="space-y-2">
        {availableActions.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Aucune action disponible</p>
        ) : (
          availableActions.map((action) => {
            const durationS = getActionDurationMs(action, toolBonus) / 1000;
            const isActive = skillState.activeAction === action.id;
            return (
              <div
                key={action.id}
                className={`flex items-center justify-between p-2 rounded border ${
                  isActive
                    ? "border-green-500 bg-green-900/20"
                    : "border-slate-700 bg-[#0d1525] hover:border-slate-500"
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-slate-200">{action.name}</div>
                  <div className="text-xs text-slate-400">
                    {durationS.toFixed(1)}s · {action.xpPerAction} XP
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "danger" : "secondary"}
                  onClick={() => handleActionClick(action.id)}
                >
                  {isActive ? "Stop" : "Start"}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
