"use client";

import { useGameStore } from "@/stores/game-store";
import { formatNumber } from "@/lib/formatters";
import { calculateGlobalLevels } from "@/lib/xp-calc";
import type { Tab } from "@/types/tabs";

interface Props {
  onNavigate: (tab: Tab) => void;
}

export default function ResourceBar({ onNavigate }: Props) {
  const { player, gold, skills, quests } = useGameStore((s) => ({
    player: s.player,
    gold: s.gold,
    skills: s.skills,
    quests: s.quests,
  }));

  const { totalLevel } = calculateGlobalLevels(skills);

  // Quête active la plus avancée
  const activeQuest = Object.values(quests)
    .filter((q) => q.status === "active")
    .map((q) => {
      const totalCurrent  = q.objectives.reduce((s, o) => s + o.current,  0);
      const totalRequired = q.objectives.reduce((s, o) => s + o.required, 0);
      const pct = totalRequired > 0 ? totalCurrent / totalRequired : 0;
      const obj = q.objectives.find((o) => o.current < o.required) ?? q.objectives[0];
      return { ...q, pct, obj };
    })
    .sort((a, b) => b.pct - a.pct)[0];

  return (
    <header
      className="flex items-center justify-between px-3 py-2 flex-shrink-0 gap-3"
      style={{
        background: "var(--abyss)",
        borderBottom: "2px solid var(--border-accent)",
        boxShadow: "0 2px 0 var(--gold-muted)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <span className="pixel-icon-sm">⚔️</span>
        <span className="font-cinzel tracking-widest" style={{ color: "var(--gold-light)", fontSize: "0.55rem" }}>
          IDLE REALMS
        </span>
      </div>

      {/* Stats perso + or */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="pixel-icon-sm">👤</span>
          <span className="font-crimson text-sm" style={{ color: "var(--text-primary)" }}>
            {player.name}
          </span>
          <span
            className="font-cinzel px-1.5 py-0.5"
            style={{ fontSize: "0.42rem", color: "var(--text-secondary)", background: "var(--surface-elevated)", border: "1px solid var(--border-accent)" }}
          >
            LV.{totalLevel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="pixel-icon-sm">🪙</span>
          <span className="font-cinzel" style={{ fontSize: "0.6rem", color: "var(--gold-light)" }}>
            {formatNumber(gold)}
          </span>
        </div>
      </div>

      {/* ── Rappel quête active ────────────────────────────────────── */}
      {activeQuest?.obj && (
        <button
          onClick={() => onNavigate("quests")}
          className="hidden sm:flex items-center gap-2 flex-shrink-0 ml-auto"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-gold)",
            padding: "3px 8px",
            maxWidth: 240,
          }}
          title="Voir mes quêtes"
        >
          <span className="pixel-icon-sm flex-shrink-0">📜</span>
          <div className="min-w-0 flex-1">
            <p
              className="font-crimson truncate"
              style={{ fontSize: "0.7rem", color: "var(--text-primary)", lineHeight: 1.3 }}
            >
              {activeQuest.obj.type === "kill"   ? `Tuer ${activeQuest.obj.target}`
               : activeQuest.obj.type === "gather" ? `Collecter ${activeQuest.obj.target}`
               : activeQuest.obj.type === "craft"  ? `Fabriquer ${activeQuest.obj.target}`
               : activeQuest.obj.target}
            </p>
            {/* Mini progress bar */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="flex-1 h-1"
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-default)" }}
              >
                <div
                  className="h-full progress-bar-fill"
                  style={{
                    width: `${Math.min(100, (activeQuest.obj.current / activeQuest.obj.required) * 100)}%`,
                    background: "var(--gold)",
                  }}
                />
              </div>
              <span className="font-cinzel flex-shrink-0" style={{ fontSize: "0.38rem", color: "var(--text-muted)" }}>
                {activeQuest.obj.current}/{activeQuest.obj.required}
              </span>
            </div>
          </div>
        </button>
      )}
    </header>
  );
}
