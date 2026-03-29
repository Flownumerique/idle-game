"use client";

import { useGameStore, type GameStore } from "@/stores/game-store";
import { getActionDurationMs, getToolBonus, getSkillDef } from "@/engine/skill-engine";
import { getRecipesForSkill } from "@/engine/craft-engine";
import { GameData } from "@/engine/data-loader";
import ForgePanel from "../craft/ForgePanel";
import CookingPanel from "../craft/CookingPanel";
import {
  getLevelForXp,
  getLevelProgress,
  getXpForLevel,
  getXpToNextLevel,
} from "@/lib/xp-calc";
import { formatNumber } from "@/lib/formatters";
import { RARITY_COLOR as RARITY_COLORS } from "@/lib/rarity";
import ProgressBar from "@/components/ui/ProgressBar";
import ActiveAction from "@/components/game/ActiveAction";
import type { SkillId } from "@/types/game";

function getItemSafe(id: string) {
  try { return GameData.item(id); } catch { return null; }
}

interface Props {
  skillId: SkillId;
  skillName: string;
  skillIcon: string;
}

export default function SkillDetailPage({ skillId, skillName, skillIcon }: Props) {
  const { skillState, inventory, equipment, startAction, stopAction } = useGameStore((s: GameStore) => ({
    skillState: s.skills[skillId],
    inventory: s.inventory,
    equipment: s.equipment,
    startAction: s.startAction,
    stopAction: s.stopAction,
  }));

  const level       = getLevelForXp(skillState.xp);
  const xpProgress  = getLevelProgress(skillState.xp);
  const xpToNext    = getXpToNextLevel(level);
  const xpInLevel   = skillState.xp - getXpForLevel(level);
  const toolBonus   = getToolBonus(equipment, skillId);
  const skillDef    = getSkillDef(skillId);

  // Craft-based panels replace the generic skill interface
  if (skillId === "smithing") return <ForgePanel />;
  if (skillId === "cooking")  return <CookingPanel />;

  function handleActionClick(actionId: string) {
    if (skillState.activeAction === actionId) {
      stopAction(skillId);
    } else {
      startAction(skillId, actionId);
    }
  }

  const allActions = [
    ...(skillDef?.actions ?? []),
    ...getRecipesForSkill(skillId, level).map((r: any) => ({
      ...r,
      baseActionTime: r.craftTime ?? 5,
      xpPerAction: r.xpPerCraft ?? 0,
      outputs: r.output ? [{ itemId: r.output.itemId, quantity: r.output.qty, chance: 1 }] : [],
    })),
  ];

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="pixel-icon-lg flex-shrink-0">{skillIcon}</span>
            <div>
              <h2
                className="font-cinzel"
                style={{ fontSize: "0.6rem", color: "var(--gold-light)", letterSpacing: "0.15em" }}
              >
                {skillName.toUpperCase()}
              </h2>
              {skillDef?.description && (
                <p className="font-crimson text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {skillDef.description}
                </p>
              )}
            </div>
          </div>
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 48, height: 48,
              border: "2px solid var(--gold)",
              background: "rgba(200,136,42,0.08)",
            }}
          >
            <div>
              <div className="font-cinzel text-center" style={{ fontSize: "1.2rem", color: "var(--text-primary)", lineHeight: 1 }}>
                {level}
              </div>
              <div className="font-cinzel text-center" style={{ fontSize: "0.4rem", color: "var(--text-muted)" }}>
                LVL
              </div>
            </div>
          </div>
        </div>

        <ProgressBar
          value={xpProgress}
          color="bg-cyan-500"
          label={`XP : ${formatNumber(xpInLevel)} / ${formatNumber(xpToNext)}`}
        />

      </div>

      {/* ── Active action ──────────────────────────────────────────────────── */}
      <ActiveAction skillId={skillId} />

      {/* ── Actions list ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="section-title mb-2">Actions &amp; Recettes</div>

        {allActions.map((action: any) => {
          const isUnlocked = level >= action.reqLevel;
          const isActive   = skillState.activeAction === action.id;
          const durationS  = getActionDurationMs(action, isUnlocked ? toolBonus : 0) / 1000;
          const hasIngredients = !action.inputs?.some(
            (input: any) => (inventory[input.itemId] ?? 0) < input.qty
          );

          const canClick = isUnlocked && (isActive || hasIngredients);

          return (
            <div
              key={action.id}
              className="rounded-sm overflow-hidden transition-all"
              onClick={canClick ? () => handleActionClick(action.id) : undefined}
              style={{
                border: isActive
                  ? "1px solid rgba(61,214,140,0.4)"
                  : isUnlocked
                  ? "1px solid var(--border-subtle)"
                  : "1px solid rgba(255,255,255,0.04)",
                background: isActive
                  ? "rgba(61,214,140,0.04)"
                  : isUnlocked
                  ? "var(--surface-card)"
                  : "rgba(0,0,0,0.2)",
                opacity: isUnlocked ? 1 : 0.5,
                cursor: canClick ? "pointer" : "default",
              }}
            >
              {/* Main action row */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {action.icon && (
                    <span className="pixel-icon-sm flex-shrink-0">{action.icon}</span>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {action.name}
                    </div>
                    {isUnlocked ? (
                      <div className="font-crimson text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {durationS.toFixed(1)}s &middot;{" "}
                        <span style={{ color: "var(--color-xp)" }}>
                          {action.xpPerAction || action.xpPerCraft} XP
                        </span>
                      </div>
                    ) : (
                      <div className="font-crimson text-xs mt-0.5" style={{ color: "var(--gold-muted)" }}>
                        Niveau {action.reqLevel} requis
                      </div>
                    )}
                  </div>
                </div>

                {isActive && (
                  <span className="font-cinzel flex-shrink-0" style={{ fontSize: "0.5rem", color: "var(--color-xp)" }}>
                    ▶ ACTIF
                  </span>
                )}
              </div>

              {/* Ingredients */}
              {action.inputs && action.inputs.length > 0 && (
                <div
                  className="px-3 pb-2.5 pt-2"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  <div
                    className="font-cinzel tracking-widest uppercase mb-1.5"
                    style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}
                  >
                    Ingrédients requis
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {action.inputs.map((input: any) => {
                      const item = getItemSafe(input.itemId);
                      const have = inventory[input.itemId] ?? 0;
                      const enough = have >= input.qty;
                      return (
                        <div key={input.itemId} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 font-crimson" style={{ color: enough ? "var(--text-primary)" : "var(--color-damage)" }}>
                            {item?.icon && <span>{item.icon}</span>}
                            <span>{item?.name ?? input.itemId}</span>
                          </span>
                          <span
                            className="font-mono"
                            style={{
                              color: enough ? "var(--text-secondary)" : "var(--color-damage)",
                              fontWeight: enough ? "normal" : "bold",
                            }}
                          >
                            {have}/{input.qty}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drops / Output */}
              {(action.outputs || action.output) && (
                <div
                  className="px-3 pb-2.5 pt-2"
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  <div
                    className="font-cinzel tracking-widest uppercase mb-1.5"
                    style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}
                  >
                    Résultat
                  </div>
                  <div className="space-y-1">
                    {action.outputs
                      ? action.outputs.map((output: { itemId: string; quantity: number; chance: number }) => {
                          const item = getItemSafe(output.itemId);
                          const chanceLabel = output.chance >= 1 ? "Garanti" : `${(output.chance * 100).toFixed(0)}%`;
                          const rarityColor = RARITY_COLORS[item?.rarity ?? "common"] ?? "var(--text-secondary)";
                          return (
                            <div key={output.itemId} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-crimson" style={{ color: rarityColor }}>
                                {item?.icon && <span>{item.icon}</span>}
                                <span>{item?.name ?? output.itemId}</span>
                                {output.quantity > 1 && (
                                  <span style={{ color: "var(--text-muted)" }}>×{output.quantity}</span>
                                )}
                              </span>
                              <span
                                className="font-mono"
                                style={{ color: output.chance >= 1 ? "var(--text-muted)" : "var(--gold-light)" }}
                              >
                                {chanceLabel}
                              </span>
                            </div>
                          );
                        })
                      : (() => {
                          const item = getItemSafe(action.output.itemId);
                          const rarityColor = RARITY_COLORS[item?.rarity ?? "common"] ?? "var(--text-secondary)";
                          return (
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-crimson" style={{ color: rarityColor }}>
                                {item?.icon && <span>{item.icon}</span>}
                                <span>{item?.name ?? action.output.itemId}</span>
                                {action.output.quantity > 1 && (
                                  <span style={{ color: "var(--text-muted)" }}>×{action.output.quantity}</span>
                                )}
                              </span>
                              <span className="font-mono italic" style={{ color: "var(--text-muted)" }}>Garanti</span>
                            </div>
                          );
                        })()}
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
