"use client";

import { useGameStore } from "@/stores/game-store";
import { computePlayerStats } from "@/engine/offline-engine";
import { getLevelProgress, getLevelForXp, calculateGlobalLevels } from "@/lib/xp-calc";
import { getNextMilestone } from "@/engine/milestone-engine";
import { COMBAT_SKILL_IDS } from "@/types/game";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import EquipmentPanel from "./EquipmentPanel";
import { useState } from "react";

const SKILL_META: Record<string, { icon: string; name: string; bar: string }> = {
  attack:       { icon: "⚔️",  name: "Attaque",      bar: "bg-amber-500"  },
  strength:     { icon: "💪",  name: "Force",        bar: "bg-orange-500" },
  ranged:       { icon: "🏹",  name: "Distance",     bar: "bg-green-500"  },
  magic:        { icon: "✨",  name: "Magie",        bar: "bg-purple-500" },
  defense:      { icon: "🛡️",  name: "Défense",      bar: "bg-blue-500"   },
  dodge:        { icon: "💨",  name: "Esquive",      bar: "bg-cyan-500"   },
  constitution: { icon: "❤️",  name: "Constitution", bar: "bg-red-500"    },
  prayer:       { icon: "🙏",  name: "Prière",       bar: "bg-yellow-400" },
};

const CLASS_NAMES: Record<string, string> = {
  warrior: "Guerrier", forester: "Forestier", mage: "Mage",
};

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <span className="font-crimson text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-cinzel" style={{ fontSize: "0.55rem", color: color ?? "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function CharacterSheet({ section = "stats" }: { section?: "stats" | "milestones" }) {
  const { player, skills, resetGame } = useGameStore((s) => ({
    player: s.player, skills: s.skills, resetGame: s.resetGame,
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
    <div className="space-y-4">

      {/* Identité */}
      <div className="game-card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="pixel-icon-lg">👤</span>
            <div>
              <h2 className="font-cinzel" style={{ fontSize: "0.7rem", color: "var(--gold-light)", letterSpacing: "0.1em" }}>
                {player.name.toUpperCase()}
              </h2>
              <p className="font-cinzel mt-1" style={{ fontSize: "0.45rem", color: "var(--text-secondary)" }}>
                {(CLASS_NAMES[player.playerClass] ?? player.playerClass).toUpperCase()}
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleReset}>Reset</Button>
        </div>

        {/* Triptyque niveaux */}
        <div className="grid grid-cols-3" style={{ border: "2px solid var(--border-accent)" }}>
          {[
            { label: "GLOBAL",  value: totalLevel,      color: "var(--text-primary)"  },
            { label: "MARTIAL", value: combatLevel,     color: "var(--color-damage)"  },
            { label: "MÉTIERS", value: professionLevel, color: "var(--color-xp)"      },
          ].map((item, i) => (
            <div
              key={i}
              className="text-center py-3"
              style={{
                background: "var(--surface-elevated)",
                borderRight: i < 2 ? "2px solid var(--border-accent)" : "none",
              }}
            >
              <div className="font-cinzel mb-1" style={{ fontSize: "0.4rem", color: "var(--text-muted)" }}>{item.label}</div>
              <div className="font-cinzel" style={{ fontSize: "1.4rem", color: item.color, lineHeight: 1 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Objectif suivant */}
        {nextMilestone && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-cinzel" style={{ fontSize: "0.45rem", color: "var(--text-muted)" }}>OBJECTIF</span>
              <span className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--gold-light)" }}>{nextMilestone.label.toUpperCase()}</span>
              <span className="font-cinzel" style={{ fontSize: "0.45rem", color: "var(--text-muted)" }}>{totalLevel}/{nextMilestone.level}</span>
            </div>
            <ProgressBar value={totalLevel / nextMilestone.level} height="h-2" color="bg-amber-500" />
          </div>
        )}
      </div>

      {/* Tab Content */}
      {section === "stats" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stats de combat */}
          <div className="game-card">
            <div className="section-title mb-4">Attributs de Combat</div>
            <div>
              <StatRow label="Style actif"        value={stats.activeStyle || "Mains Nues"}           color="var(--gold-light)"   />
              <StatRow label="Points de vie"       value={`${Math.floor(stats.maxHp)}`}                color="var(--color-heal)"   />
              <StatRow label="Regen. HP"           value={`${stats.hpRegen.toFixed(1)}/s`}             color="var(--color-heal)"   />
              <StatRow label="Attaque"             value={`${Math.floor(stats.attack)}`}               color="var(--color-damage)" />
              <StatRow label="Vitesse d'attaque"   value={`${stats.attackSpeed.toFixed(2)}s`}          color="var(--gold-light)"   />
              <StatRow label="Chance de critique"  value={`${(stats.critChance * 100).toFixed(1)}%`}   color="var(--color-crit)"   />
              <StatRow label="Armure"              value={`${Math.floor(stats.defense)}`}              color="var(--color-xp)"     />
              <StatRow label="Chance d'esquive"    value={`${(stats.dodgeChance * 100).toFixed(1)}%`}  color="var(--color-magic)"  />
            </div>
          </div>

          {/* Maîtrises martiales */}
          <div className="game-card">
            <div className="section-title mb-4">Maîtrises Martiales</div>
            <div className="space-y-3">
              {COMBAT_SKILL_IDS.map((skillId) => {
                const skill    = skills[skillId] || { xp: 0 };
                const level    = getLevelForXp(skill.xp);
                const progress = getLevelProgress(skill.xp);
                const meta     = SKILL_META[skillId];
                return (
                  <div key={skillId}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="pixel-icon-sm">{meta.icon}</span>
                      <span className="font-crimson text-sm flex-1" style={{ color: "var(--text-secondary)" }}>{meta.name}</span>
                      <span className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--text-primary)" }}>{level}</span>
                    </div>
                    <ProgressBar value={progress} height="h-1.5" color={meta.bar} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="game-card">
          <div className="section-title mb-4">Milestones & Succès</div>
          <div className="space-y-6">
             <div className="p-4 rounded-sm" style={{ background: "rgba(201,146,42,0.05)", border: "1px solid rgba(201,146,42,0.2)" }}>
                <p className="font-crimson text-sm" style={{ color: "var(--text-secondary)" }}>
                  Les milestones représentent votre progression globale dans Idle Realms. 
                  Chaque palier atteint débloque de nouvelles fonctionnalités ou des bonus permanents.
                </p>
             </div>
             
             {/* Simple placeholder for more milestones if they exist */}
             <div className="space-y-3 opacity-50">
                <div className="flex justify-between items-center text-xs font-cinzel">
                  <span style={{ color: "var(--text-muted)" }}>PROCHAIN PALIER MAJEUR</span>
                  <span style={{ color: "var(--gold)" }}>LV.100</span>
                </div>
                <div className="h-2 bg-void border border-border-subtle" />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
