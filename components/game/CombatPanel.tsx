"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { getAllZones, spawnMonster, getMonstersInZone } from "@/engine/combat-engine";
import { computePlayerStats } from "@/engine/offline-engine";
import { getLevelForXp, getLevelProgress } from "@/lib/xp-calc";
import { mulberry32 } from "@/lib/rng";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { COMBAT_SKILL_IDS } from "@/types/game";
import type { SkillId } from "@/types/game";

// ── Metadata ──────────────────────────────────────────────────────────────────

const SKILL_META: Record<string, { name: string; icon: string; bar: string; selected: string }> = {
  attack:       { name: "Attaque",      icon: "⚔️",  bar: "bg-amber-500",  selected: "border-amber-500  bg-amber-500/10"  },
  strength:     { name: "Force",        icon: "💪",  bar: "bg-orange-500", selected: "border-orange-500 bg-orange-500/10" },
  ranged:       { name: "Distance",     icon: "🏹",  bar: "bg-green-500",  selected: "border-green-500  bg-green-500/10"  },
  magic:        { name: "Magie",        icon: "✨",  bar: "bg-purple-500", selected: "border-purple-500 bg-purple-500/10" },
  defense:      { name: "Défense",      icon: "🛡️",  bar: "bg-blue-500",   selected: "border-blue-500   bg-blue-500/10"   },
  dodge:        { name: "Esquive",      icon: "💨",  bar: "bg-cyan-500",   selected: "border-cyan-500   bg-cyan-500/10"   },
  constitution: { name: "Constitution", icon: "❤️",  bar: "bg-red-500",    selected: "border-red-500    bg-red-500/10"    },
  prayer:       { name: "Prière",       icon: "🙏",  bar: "bg-yellow-400", selected: "border-yellow-400 bg-yellow-400/10" },
};

const TRAINABLE_SKILLS = COMBAT_SKILL_IDS.filter(
  (id) => id !== "constitution" && id !== "prayer"
) as SkillId[];

const RARITY_TEXT: Record<string, string> = {
  common: "text-slate-400", uncommon: "text-green-400",
  rare: "text-blue-400",    boss: "text-amber-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CombatPanel() {
  const state   = useGameStore((s) => s);
  const skills  = useGameStore((s) => s.skills);
  const { combat, unlockedZones, startCombat, stopCombat, setAutoRestart, updateCombatState } = state;

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const allZones    = getAllZones();
  const playerStats = computePlayerStats(state);
  const hpPct       = combat.playerHp / playerStats.maxHp;

  const playerCombatLevel = Math.floor(
    ((getLevelForXp(skills.defense.xp) + getLevelForXp(skills.constitution.xp) +
      Math.floor(getLevelForXp(skills.prayer.xp) / 2)) * 0.25) +
    Math.max(
      getLevelForXp(skills.attack.xp) + getLevelForXp(skills.strength.xp),
      getLevelForXp(skills.magic.xp)  * 1.5,
      getLevelForXp(skills.ranged.xp) * 1.5,
    ) * 0.325
  );

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

  const recentLog = [...combat.log].reverse().slice(0, 12);

  return (
    <div className="space-y-5">

      {/* ── 1. Status bar ──────────────────────────────────────────────────── */}
      <div className="game-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">⚔️ Combat</h2>
          <span className="text-xs text-slate-400">
            Niveau de combat :{" "}
            <span className="text-amber-400 font-bold text-sm">{playerCombatLevel}</span>
          </span>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Points de vie</span>
            <span className="font-mono">{Math.floor(combat.playerHp)} / {playerStats.maxHp}</span>
          </div>
          <ProgressBar
            value={hpPct}
            color={hpPct > 0.5 ? "bg-green-500" : hpPct > 0.25 ? "bg-yellow-500" : "bg-red-500"}
            height="h-3"
          />
        </div>
      </div>

      {/* ── 2. Main area: two columns ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Left — Zone / Active fight */}
        <div className="game-card space-y-4">
          {combat.active && combat.currentMonster ? (
            <>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Combat en cours</h3>

              <div className="bg-[#090f1c] rounded-lg border border-red-900/40 p-4 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-red-500 to-red-900" />
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-black text-lg text-slate-100 leading-tight">
                      {combat.currentMonster.name}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">Entité Hostile</div>
                  </div>
                  <span className="font-mono font-bold text-red-400 bg-red-950/50 border border-red-900/50 px-2 py-1 rounded text-sm">
                    {Math.floor(combat.currentMonster.hp)}
                    <span className="text-xs text-red-700"> / {combat.currentMonster.maxHp}</span>
                  </span>
                </div>
                <ProgressBar
                  value={combat.currentMonster.hp / combat.currentMonster.maxHp}
                  color="bg-red-600" height="h-2.5"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="danger" className="flex-1 font-bold uppercase tracking-wide" onClick={stopCombat}>
                  Fuir
                </Button>
                <Button
                  variant={combat.autoRestart ? "primary" : "secondary"}
                  className="flex-1 font-bold uppercase tracking-wide whitespace-nowrap"
                  onClick={() => setAutoRestart(!combat.autoRestart)}
                >
                  Auto {combat.autoRestart ? "✓" : "✗"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Zones d'exploration</h3>

              <div className="space-y-2">
                {allZones.map((zone) => {
                  if (!unlockedZones.includes(zone.id)) return null;
                  const reqCombat  = zone.reqLevel?.combat ?? 1;
                  const meetsLevel = playerCombatLevel >= reqCombat;
                  const isSelected = selectedZoneId === zone.id;
                  const monsters   = getMonstersInZone(zone.id);
                  const regulars   = monsters.filter((m) => !m.isBoss);
                  const boss       = monsters.find((m)  => m.isBoss);

                  return (
                    <div key={zone.id} className="rounded-xl border border-slate-700/60 overflow-hidden">
                      {/* Card header */}
                      <button
                        className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                          isSelected ? "bg-[#131f38]" : "bg-[#0d1525] hover:bg-[#111a2e]"
                        }`}
                        onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
                      >
                        <span className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-800 rounded-lg border border-slate-700 flex-shrink-0">
                          {zone.icon ?? "🌍"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200 text-sm">{zone.name}</span>
                            {boss && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/40 px-1.5 py-px rounded uppercase">
                                Boss
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {regulars.slice(0, 4).map((m) => (
                              <span key={m.def.id} className="text-sm" title={m.def.name}>{m.def.icon ?? "👾"}</span>
                            ))}
                            {boss && <span className="text-sm text-amber-400 ml-0.5" title={boss.def.name}>{boss.def.icon ?? "👑"}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            meetsLevel
                              ? "text-green-400 border-green-700/40 bg-green-900/20"
                              : "text-red-400 border-red-700/40 bg-red-900/20"
                          }`}>
                            {meetsLevel ? "✓" : "🔒"} {reqCombat}
                          </span>
                          <div className="flex gap-1">
                            <span className="text-[9px] text-cyan-400 bg-cyan-900/20 border border-cyan-700/30 px-1.5 rounded">×{zone.combatXpMultiplier} XP</span>
                            <span className="text-[9px] text-amber-400 bg-amber-900/20 border border-amber-700/30 px-1.5 rounded">×{zone.goldMultiplier} 🪙</span>
                          </div>
                        </div>
                      </button>

                      {/* Expanded */}
                      {isSelected && (
                        <div className="border-t border-slate-700/50 bg-[#090f1c] p-3 space-y-3">
                          {zone.lore && (
                            <p className="text-xs text-slate-400 italic border-l-2 border-slate-600 pl-3 leading-relaxed">
                              "{zone.lore}"
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-1.5">
                            {regulars.map((m) => (
                              <div key={m.def.id} className={`flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/30 ${RARITY_TEXT[m.def.rarity ?? "common"] ?? "text-slate-400"}`}>
                                <span className="text-lg flex-shrink-0">{m.def.icon ?? "👾"}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-200 truncate">{m.def.name}</div>
                                  <div className="text-[10px] text-slate-500">❤️{m.def.stats.hp} ⚔️{m.def.stats.attack}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {boss && (
                            <div className="rounded-lg border border-amber-700/40 bg-amber-900/10 p-2.5 flex items-center gap-3">
                              <span className="text-2xl">{boss.def.icon ?? "👑"}</span>
                              <div>
                                <div className="text-xs font-bold text-amber-300">{boss.def.name}</div>
                                <div className="text-[10px] text-slate-400">❤️{boss.def.stats.hp} ⚔️{boss.def.stats.attack} · {((zone.bossChance ?? 0.02) * 100).toFixed(0)}% de chance</div>
                              </div>
                            </div>
                          )}
                          {meetsLevel ? (
                            <Button className="w-full font-bold uppercase tracking-wide" onClick={() => handleEnterZone(zone.id)}>
                              ⚔️ Explorer
                            </Button>
                          ) : (
                            <div className="text-center text-xs text-red-400 bg-red-900/10 border border-red-800/30 rounded-lg py-2.5">
                              🔒 Niveau {reqCombat} requis (tu as {playerCombatLevel})
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right — Training style */}
        <div className="game-card space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Style d'entraînement</h3>
            <p className="text-[10px] text-slate-500 mt-1">
              L'XP de combat est versée au skill sélectionné. La Constitution progresse toujours passivement.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TRAINABLE_SKILLS.map((skillId) => {
              const meta     = SKILL_META[skillId];
              const skill    = skills[skillId];
              const level    = getLevelForXp(skill.xp);
              const progress = getLevelProgress(skill.xp);
              const isActive = trainingStyle === skillId;

              return (
                <button
                  key={skillId}
                  onClick={() => updateCombatState({ trainingStyle: skillId })}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    isActive
                      ? meta.selected
                      : "border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600"
                  }`}
                >
                  <div className="text-2xl mb-1.5">{meta.icon}</div>
                  <div className={`text-xs font-bold mb-2 ${isActive ? "text-slate-100" : "text-slate-400"}`}>
                    {meta.name}
                  </div>
                  <div className={`text-[10px] font-mono mb-1.5 ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                    Niv. {level}
                  </div>
                  <ProgressBar value={progress} height="h-1" color={meta.bar} />
                </button>
              );
            })}
          </div>

          {/* Constitution passive reminder */}
          <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-2.5 flex items-center gap-2.5">
            <span className="text-xl flex-shrink-0">❤️</span>
            <div>
              <div className="text-xs font-semibold text-slate-300">Constitution</div>
              <div className="text-[10px] text-slate-500">Niv. {getLevelForXp(skills.constitution.xp)} — progression passive</div>
              <ProgressBar value={getLevelProgress(skills.constitution.xp)} height="h-1" color="bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. All combat masteries ────────────────────────────────────────── */}
      <div className="game-card">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Maîtrises Martiales</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {COMBAT_SKILL_IDS.map((skillId) => {
            const meta     = SKILL_META[skillId];
            const skill    = skills[skillId];
            const level    = getLevelForXp(skill.xp);
            const progress = getLevelProgress(skill.xp);
            return (
              <div key={skillId} className="group">
                <div className="flex justify-between items-center text-[10px] mb-1.5">
                  <span className="text-slate-500 flex items-center gap-1 font-bold uppercase tracking-tighter group-hover:text-slate-300 transition-colors">
                    {meta.icon} {meta.name}
                  </span>
                  <span className="font-mono font-bold text-slate-200 bg-slate-800/50 px-1.5 rounded">
                    {level}
                  </span>
                </div>
                <ProgressBar value={progress} height="h-1" color={meta.bar} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Combat log ──────────────────────────────────────────────────── */}
      <div className="game-card">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-800">
          Journal de combat
        </p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {recentLog.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-1">Prêt pour le combat...</p>
          ) : (
            recentLog.map((entry, i) => (
              <div key={i} className="text-[11px] leading-relaxed pl-2 border-l-2 border-transparent hover:border-slate-700">
                {entry.type === "player_hit" && (
                  <span className={entry.crit ? "text-yellow-400 font-bold" : "text-blue-400"}>
                    <span className="text-slate-600 mr-1.5">⚔️</span>
                    Vous infligez {entry.dmg} dégâts{entry.crit ? " ✨ CRITIQUE" : ""}
                  </span>
                )}
                {entry.type === "monster_hit" && (
                  <span className="text-red-400">
                    <span className="text-slate-600 mr-1.5">🩸</span>
                    Monstre inflige {entry.dmg} dégâts
                  </span>
                )}
                {entry.type === "monster_death" && (
                  <span className="text-green-400 font-bold">
                    <span className="text-slate-600 mr-1.5">💀</span>Cible neutralisée !
                  </span>
                )}
                {entry.type === "player_death" && (
                  <span className="text-red-500 font-bold animate-pulse">
                    <span className="text-slate-600 mr-1.5">⚠️</span>Aventurier terrassé...
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
