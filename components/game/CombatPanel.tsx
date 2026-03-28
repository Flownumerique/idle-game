"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { getAllZones, getZone, spawnMonster, getMonstersInZone, spawnBossForZone } from "@/engine/combat-engine";
import { computePlayerStats } from "@/engine/offline-engine";
import { getLevelForXp, getLevelProgress } from "@/lib/xp-calc";
import { mulberry32 } from "@/lib/rng";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import CombatEquipment from "./CombatEquipment";
import { COMBAT_SKILL_IDS } from "@/types/game";
import type { SkillId } from "@/types/game";
import { RARITY_COLOR } from "@/lib/rarity";
import ZoneCard from "@/components/game/ZoneCard";
import { computeCombatLevel } from "@/engine/zone-lock";

// ── Metadata ──────────────────────────────────────────────────────────────────

const SKILL_META: Record<string, { name: string; icon: string; bar: string; borderColor: string }> = {
  attack:       { name: "Attaque",      icon: "⚔️",  bar: "bg-amber-500",  borderColor: "rgba(245,158,11,0.4)"  },
  strength:     { name: "Force",        icon: "💪",  bar: "bg-orange-500", borderColor: "rgba(249,115,22,0.4)"  },
  ranged:       { name: "Distance",     icon: "🏹",  bar: "bg-green-500",  borderColor: "rgba(34,197,94,0.4)"   },
  magic:        { name: "Magie",        icon: "✨",  bar: "bg-purple-500", borderColor: "rgba(168,85,247,0.4)"  },
  defense:      { name: "Défense",      icon: "🛡️",  bar: "bg-blue-500",   borderColor: "rgba(59,130,246,0.4)"  },
  dodge:        { name: "Esquive",      icon: "💨",  bar: "bg-cyan-500",   borderColor: "rgba(6,182,212,0.4)"   },
  constitution: { name: "Constitution", icon: "❤️",  bar: "bg-red-500",    borderColor: "rgba(239,68,68,0.4)"   },
  prayer:       { name: "Prière",       icon: "🙏",  bar: "bg-yellow-400", borderColor: "rgba(250,204,21,0.4)"  },
};

const TRAINABLE_SKILLS = COMBAT_SKILL_IDS.filter(
  (id) => id !== "constitution" && id !== "prayer"
) as SkillId[];


// ── Component ─────────────────────────────────────────────────────────────────

export default function CombatPanel({ section = "map" }: { section?: "map" | "training" | "mastery" }) {
  const state    = useGameStore((s) => s);
  const skills   = useGameStore((s) => s.skills);
  const { combat, startCombat, stopCombat, setAutoRestart, updateCombatState } = state;

  const allZones    = getAllZones();
  const playerStats = computePlayerStats(state);
  const hpPct       = combat.playerHp / playerStats.maxHp;

  const playerCombatLevel = computeCombatLevel(state);

  const trainingStyle = (combat.trainingStyle ?? "attack") as SkillId;

  function handleEnterZone(zoneId: string) {
    const rng          = mulberry32(Date.now());
    const zoneMonsters = getMonstersInZone(zoneId);
    const monster      = spawnMonster(zoneMonsters, rng);
    updateCombatState({
      active: true, zoneId, currentMonster: monster,
      playerHitCooldown: playerStats.attackSpeed * 1000,
      monsterHitCooldown: (monster?.stats.attackSpeed ?? 2) * 1000,
    });
    startCombat(zoneId);
  }

  function handleBossFight(zoneId: string) {
    const boss = spawnBossForZone(zoneId);
    if (!boss) return;
    updateCombatState({
      active: true, zoneId, currentMonster: boss,
      playerHitCooldown: playerStats.attackSpeed * 1000,
      monsterHitCooldown: boss.stats.attackSpeed * 1000,
    });
    startCombat(zoneId);
  }

  const recentLog = [...combat.log].reverse().slice(0, 14);
  const hpColor = hpPct > 0.5 ? "bg-green-500" : hpPct > 0.25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-4">

      {/* ── 1. Status bar (Always visible) ────────────────────────────────── */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="pixel-icon-sm">⚔️</span>
            <h2 className="font-cinzel" style={{ fontSize: "0.55rem", color: "var(--gold-light)", letterSpacing: "0.15em" }}>
              COMBAT
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-cinzel tracking-widest" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
              NIVEAU DE COMBAT
            </span>
            <span className="font-mono font-bold" style={{ fontSize: "0.9rem", color: "var(--gold-light)" }}>
              {playerCombatLevel}
            </span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1" style={{ fontSize: "0.7rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Points de Vie</span>
            <span className="font-mono" style={{ color: "var(--text-primary)" }}>
              {Math.floor(combat.playerHp)} / {playerStats.maxHp}
            </span>
          </div>
          <ProgressBar value={hpPct} color={hpColor} height="h-3" />
        </div>
      </div>

      {/* ── 2. Tab Content ────────────────────────────────────────────────── */}
      
      {section === "map" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Left — Zone selection or active fight */}
          <div className="game-card space-y-4">
            {combat.active && combat.currentMonster ? (
              <>
                <div className="section-title">Combat en cours</div>
                {(() => {
                  const m = combat.currentMonster!;
                  const zone = getZone(combat.zoneId!);
                  const xpMult = zone?.combatXpMultiplier ?? 1;
                  const xpOnKill = Math.round(m.combatXp * xpMult);
                  const rarityColor = RARITY_COLOR[m.rarity ?? "common"] ?? "var(--text-secondary)";
                  return (
                    <div
                      className="rounded-sm relative overflow-hidden"
                      style={{ background: "rgba(130,20,20,0.08)", border: "1px solid rgba(180,30,30,0.3)" }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-0.5"
                        style={{ background: "linear-gradient(to bottom, #e83030, rgba(140,20,20,0.2))" }}
                      />
                      <div className="flex items-center gap-3 px-4 pt-4 pb-2 pl-5">
                        <span className="pixel-icon flex-shrink-0" style={{ fontSize: "1.6rem" }}>{m.icon ?? "👾"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-cinzel font-bold" style={{ fontSize: "0.9rem", color: rarityColor }}>{m.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-cinzel uppercase tracking-widest" style={{ fontSize: "0.42rem", color: rarityColor, opacity: 0.8 }}>{m.rarity ?? "commun"}</span>
                            <span style={{ color: "var(--border-subtle)" }}>·</span>
                            <span className="font-cinzel tracking-widest" style={{ fontSize: "0.42rem", color: "var(--color-xp)" }}>+{xpOnKill} XP</span>
                          </div>
                        </div>
                        <div className="font-mono font-bold px-2 py-1 flex-shrink-0" style={{ background: "rgba(180,20,20,0.2)", border: "1px solid rgba(180,20,20,0.4)", color: "var(--color-damage)", fontSize: "0.85rem" }}>
                          {Math.floor(m.hp)}<span style={{ fontSize: "0.65rem", color: "rgba(224,80,80,0.5)" }}>/{m.maxHp}</span>
                        </div>
                      </div>
                      <div className="px-4 pb-3 pl-5">
                        <ProgressBar value={m.hp / m.maxHp} color="bg-red-600" height="h-2" />
                      </div>
                      <div className="flex gap-4 px-4 pb-3 pl-5" style={{ borderTop: "1px solid rgba(180,30,30,0.15)", paddingTop: "0.5rem" }}>
                        <span className="font-crimson text-xs" style={{ color: "var(--text-muted)" }}>⚔️ <span style={{ color: "var(--text-secondary)" }}>{m.stats.attack}</span></span>
                        <span className="font-crimson text-xs" style={{ color: "var(--text-muted)" }}>🛡️ <span style={{ color: "var(--text-secondary)" }}>{m.stats.defense}</span></span>
                        <span className="font-crimson text-xs" style={{ color: "var(--text-muted)" }}>⚡ <span style={{ color: "var(--text-secondary)" }}>{m.stats.attackSpeed}s</span></span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2">
                  <Button variant="danger" className="flex-1" onClick={stopCombat}>Fuir</Button>
                  <Button variant={combat.autoRestart ? "primary" : "secondary"} className="flex-1 whitespace-nowrap" onClick={() => setAutoRestart(!combat.autoRestart)}>Auto {combat.autoRestart ? "✓" : "✗"}</Button>
                </div>
              </>
            ) : (
              <>
                <div className="section-title">Zones d&apos;exploration</div>
                <div className="space-y-2">
                  {allZones.map((zone) => (
                    <ZoneCard
                      key={zone.id}
                      zone={zone}
                      onEnter={() => handleEnterZone(zone.id)}
                      onBossFight={() => handleBossFight(zone.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right — Combat Log */}
          <div className="game-card">
            <div className="section-title mb-3">Journal de Combat</div>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
              {recentLog.length === 0 ? (<p className="font-crimson italic text-xs" style={{ color: "var(--text-muted)" }}>Prêt pour le combat...</p>) : (
                recentLog.map((entry, i) => (
                  <div key={i} className="text-xs leading-relaxed pl-2.5 log-entry-new" style={{ borderLeft: "2px solid var(--border-subtle)" }}>
                    {entry.type === "player_hit" && entry.crit && (<span className="log-crit"><span className="mr-1.5" style={{ color: "var(--border-accent)" }}>⚔️</span>Frappe critique — {entry.dmg} dégâts !</span>)}
                    {entry.type === "player_hit" && !entry.crit && (<span style={{ color: "#5a8aac" }}><span className="mr-1.5" style={{ color: "var(--border-accent)" }}>⚔️</span>Vous infligez {entry.dmg} dégâts</span>)}
                    {entry.type === "monster_hit" && (<span className="log-damage"><span className="mr-1.5" style={{ color: "var(--border-accent)" }}>🩸</span>Vous subissez {entry.dmg} dégâts</span>)}
                    {entry.type === "monster_death" && (
                      <span className="log-kill">
                        <span className="mr-1.5" style={{ color: "var(--border-accent)" }}>💀</span>
                        {entry.monsterName ? `Vous tuez ${entry.monsterName}.` : 'Ennemi neutralisé !'}
                      </span>
                    )}
                    {entry.type === "combat_xp" && entry.xpGains && (
                      <span style={{ color: "var(--color-xp)" }}>
                        <span className="mr-1.5" style={{ color: "var(--border-accent)" }}>✦</span>
                        {entry.xpGains.map(g =>
                          `+${g.amount} XP ${SKILL_META[g.skillId]?.name ?? g.skillId}`
                        ).join('\u2003')}
                      </span>
                    )}
                    {entry.type === "player_death" && (<span className="log-death"><span className="mr-1.5" style={{ color: "var(--border-accent)" }}>⚠️</span>Aventurier terrassé...</span>)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {section === "training" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           <CombatEquipment />
           <div className="game-card space-y-4">
              <div>
                <div className="section-title mb-2">Style d&apos;entraînement</div>
                <p className="font-crimson text-xs" style={{ color: "var(--text-muted)" }}>L&apos;XP de combat est versée au skill sélectionné. La Constitution progresse toujours.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TRAINABLE_SKILLS.map((skillId) => {
                  const meta     = SKILL_META[skillId];
                  const skill    = skills[skillId];
                  const level    = getLevelForXp(skill.xp);
                  const progress = getLevelProgress(skill.xp);
                  const isActive = trainingStyle === skillId;
                  return (
                    <button key={skillId} onClick={() => updateCombatState({ trainingStyle: skillId })} className="rounded-sm p-2.5 text-center transition-all" style={{ border: `1px solid ${isActive ? meta.borderColor : "var(--border-subtle)"}`, background: isActive ? `rgba(${meta.borderColor.slice(5,-0.2)}, 0.06)` : "var(--surface-card)", boxShadow: isActive ? `0 0 12px ${meta.borderColor}` : "none" }}>
                      <div className="text-xl mb-1 leading-none">{meta.icon}</div>
                      <div className="font-cinzel tracking-wide mb-1.5" style={{ fontSize: "0.6rem", color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>{meta.name}</div>
                      <div className="font-mono mb-1.5" style={{ fontSize: "0.65rem", color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>Niv.{level}</div>
                      <ProgressBar value={progress} height="h-1" color={meta.bar} />
                    </button>
                  );
                })}
              </div>
              <div className="rounded-sm p-2.5 flex items-center gap-2.5" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <span className="text-xl leading-none flex-shrink-0">❤️</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-cinzel text-xs tracking-wide" style={{ color: "var(--text-secondary)" }}>Constitution</span>
                    <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{getLevelForXp(skills.constitution.xp)}</span>
                  </div>
                  <ProgressBar value={getLevelProgress(skills.constitution.xp)} height="h-1" color="bg-red-500" />
                  <p className="font-crimson mt-1" style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Progression passive</p>
                </div>
              </div>
           </div>
        </div>
      )}

      {section === "mastery" && (
        <div className="game-card">
          <div className="section-title mb-4">Maîtrises Martiales</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {COMBAT_SKILL_IDS.map((skillId) => {
              const meta     = SKILL_META[skillId];
              const skill    = skills[skillId];
              const level    = getLevelForXp(skill.xp);
              const progress = getLevelProgress(skill.xp);
              return (
                <div key={skillId}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="flex items-center gap-1" style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                      <span className="text-xs leading-none">{meta.icon}</span>
                      <span className="font-cinzel tracking-wide uppercase">{meta.name}</span>
                    </span>
                    <span className="font-mono font-bold text-xs" style={{ color: "var(--text-primary)" }}>{level}</span>
                  </div>
                  <ProgressBar value={progress} height="h-1" color={meta.bar} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
