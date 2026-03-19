"use client";

import { useGameStore } from "@/stores/game-store";
import { getActionDurationMs, getToolBonus, getSkillDef } from "@/engine/skill-engine";
import { getRecipesForSkill } from "@/engine/craft-engine";
import { GameData } from "@/engine/data-loader";
import {
  getLevelForXp,
  getLevelProgress,
  getXpForLevel,
  getXpToNextLevel,
} from "@/lib/xp-calc";
import { formatNumber } from "@/lib/formatters";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import type { SkillId } from "@/types/game";

const RARITY_COLORS: Record<string, string> = {
  common:    "text-slate-300",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  epic:      "text-purple-400",
  legendary: "text-amber-400",
};

function getItemSafe(id: string) {
  try { return GameData.item(id); } catch { return null; }
}

interface Props {
  skillId: SkillId;
  skillName: string;
  skillIcon: string;
}

export default function SkillDetailPage({ skillId, skillName, skillIcon }: Props) {
  const { skillState, inventory, equipment, startAction, stopAction } = useGameStore((s) => ({
    skillState: s.skills[skillId],
    inventory: s.inventory,
    equipment: s.equipment,
    startAction: s.startAction,
    stopAction: s.stopAction,
  }));

  const level = getLevelForXp(skillState.xp);
  const xpProgress = getLevelProgress(skillState.xp);
  const xpToNext = getXpToNextLevel(level);
  const xpInLevel = skillState.xp - getXpForLevel(level);
  const toolBonus = getToolBonus(equipment, skillId);

  const skillDef = getSkillDef(skillId);
  const allActions = skillDef?.actions ?? [];

  function handleActionClick(actionId: string) {
    if (skillState.activeAction === actionId) {
      stopAction(skillId);
    } else {
      startAction(skillId, actionId);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{skillIcon}</span>
            <div>
              <h2 className="text-xl font-bold text-slate-200">{skillName}</h2>
              {skillDef?.description && (
                <p className="text-xs text-slate-400 mt-0.5">{skillDef.description}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-100">{level}</div>
            <div className="text-xs text-slate-500">Niveau</div>
          </div>
        </div>

        <ProgressBar
          value={xpProgress}
          color="bg-cyan-500"
          label={`XP : ${formatNumber(xpInLevel)} / ${formatNumber(xpToNext)}`}
        />

        {skillState.activeAction && (
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar
              value={skillState.actionProgress}
              color="bg-green-500"
              height="h-1.5"
            />
            <span className="text-xs text-green-400 whitespace-nowrap animate-pulse">En cours</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide px-1">
          Actions & Recettes
        </h3>

        {[...(skillDef?.actions ?? []), ...getRecipesForSkill(skillId, level).map((r: any) => ({
          ...r,
          baseActionTime: r.craftTime ?? 5,
          xpPerAction: r.xpPerCraft ?? 0,
          outputs: r.output ? [{ itemId: r.output.itemId, quantity: r.output.qty, chance: 1 }] : [],
        }))].map((action: any) => {
          const isUnlocked = level >= action.reqLevel;
          const isActive = skillState.activeAction === action.id;
          const durationS = getActionDurationMs(action, isUnlocked ? toolBonus : 0) / 1000;

          return (
            <div
              key={action.id}
              className={`rounded-lg border transition-colors ${
                isActive
                  ? "border-green-500/60 bg-green-900/10"
                  : isUnlocked
                  ? "border-slate-700 bg-[#0d1525]"
                  : "border-slate-800 bg-[#0a1020] opacity-50"
              }`}
            >
              {/* Action row */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2 min-w-0">
                  {action.icon && <span className="text-xl flex-shrink-0">{action.icon}</span>}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{action.name}</div>
                    {isUnlocked ? (
                      <div className="text-xs text-slate-400">
                        {durationS.toFixed(1)}s &middot; <span className="text-cyan-400">{action.xpPerAction || (action as any).xpPerCraft} XP</span>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-500/80">
                        Niveau {action.reqLevel} requis
                      </div>
                    )}
                  </div>
                </div>

                {isUnlocked && (
                  <Button
                    size="sm"
                    variant={isActive ? "danger" : "secondary"}
                    disabled={!isActive && (action as any).inputs?.some((input: any) => (inventory[input.itemId] ?? 0) < input.qty)}
                    onClick={() => handleActionClick(action.id)}
                  >
                    {isActive ? "Stop" : (action as any).inputs ? "Forger" : "Start"}
                  </Button>
                )}
              </div>

              {/* Ingredients (Inputs) */}
              {(action as any).inputs && (action as any).inputs.length > 0 && (
                <div className="px-3 pb-2 border-t border-slate-700/40 pt-2">
                  <div className="text-[10px] text-slate-500 uppercase mb-1 font-bold">Ingrédients requis</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {(action as any).inputs.map((input: any) => {
                      const item = getItemSafe(input.itemId);
                      const hasEnough = (inventory[input.itemId] ?? 0) >= input.qty;
                      return (
                        <div key={input.itemId} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            {item?.icon && <span>{item.icon}</span>}
                            <span className={hasEnough ? "text-slate-200" : "text-red-400"}>{item?.name ?? input.itemId}</span>
                          </span>
                          <span className={hasEnough ? "text-slate-400" : "text-red-400 font-bold"}>
                            {inventory[input.itemId] ?? 0} / {input.qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drops / Output */}
              {((action as any).outputs || (action as any).output) && (
                <div className="px-3 pb-3 border-t border-slate-700/40 pt-2">
                  <div className="text-[10px] text-slate-500 uppercase mb-1 font-bold">Résultat</div>
                  <div className="grid grid-cols-1 gap-1">
                    {(action as any).outputs ? (action as any).outputs.map(
                      (output: { itemId: string; quantity: number; chance: number }) => {
                        const item = getItemSafe(output.itemId);
                        const chanceLabel =
                          output.chance >= 1
                            ? "Garanti"
                            : `${(output.chance * 100).toFixed(0)}%`;
                        const rarityColor =
                          RARITY_COLORS[item?.rarity ?? "common"] ?? "text-slate-300";

                        return (
                          <div
                            key={output.itemId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className={`flex items-center gap-1.5 ${rarityColor}`}>
                              {item?.icon && <span>{item.icon}</span>}
                              <span>{item?.name ?? output.itemId}</span>
                              {output.quantity > 1 && (
                                <span className="text-slate-500">×{output.quantity}</span>
                              )}
                            </span>
                            <span
                              className={
                                output.chance >= 1
                                  ? "text-slate-500"
                                  : "text-amber-400 font-medium"
                              }
                            >
                              {chanceLabel}
                            </span>
                          </div>
                        );
                      }
                    ) : (
                      (() => {
                        const output = (action as any).output;
                        const item = getItemSafe(output.itemId);
                        const rarityColor = RARITY_COLORS[item?.rarity ?? "common"] ?? "text-slate-300";
                        return (
                          <div className="flex items-center justify-between text-xs">
                            <span className={`flex items-center gap-1.5 ${rarityColor}`}>
                              {item?.icon && <span>{item.icon}</span>}
                              <span>{item?.name ?? output.itemId}</span>
                              {output.quantity > 1 && <span className="text-slate-500">×{output.quantity}</span>}
                            </span>
                            <span className="text-slate-500 text-xs italic">Garanti</span>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
