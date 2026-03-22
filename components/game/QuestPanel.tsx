"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import ProgressBar from "@/components/ui/ProgressBar";

type SubTab = "quests" | "achievements";

const OBJECTIVE_LABELS: Record<string, string> = {
  kill:   "Tuer",
  gather: "Collecter",
  craft:  "Fabriquer",
  sell:   "Vendre",
  reach:  "Atteindre",
};

const QUEST_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  mq: { label: "Principale",  color: "var(--gold-light)",  icon: "★" },
  sq: { label: "Métier",      color: "var(--color-xp)",    icon: "◆" },
  dq: { label: "Journalière", color: "var(--color-heal)",  icon: "▸" },
};

function getQuestType(questId: string) {
  if (questId.startsWith("mq")) return QUEST_TYPE_META.mq;
  if (questId.startsWith("sq")) return QUEST_TYPE_META.sq;
  return QUEST_TYPE_META.dq;
}

export default function QuestPanel({ section = "active" }: { section?: "active" | "completed" }) {
  const quests = useGameStore((s) => s.quests);

  const activeQuests = Object.values(quests)
    .filter((q) => q.status === "active")
    .map((q) => {
      const totalCurrent  = q.objectives.reduce((s, o) => s + o.current,  0);
      const totalRequired = q.objectives.reduce((s, o) => s + o.required, 0);
      return { ...q, globalPct: totalRequired > 0 ? totalCurrent / totalRequired : 0 };
    })
    .sort((a, b) => b.globalPct - a.globalPct);

  const completedQuests = Object.values(quests).filter((q) => q.status === "completed");

  return (
    <div className="space-y-4">
      <div className="game-card">
        <div className="flex items-center gap-3">
          <span className="pixel-icon-lg">📜</span>
          <div>
            <h2 className="font-cinzel" style={{ fontSize: "0.65rem", color: "var(--gold-light)", letterSpacing: "0.15em" }}>
              JOURNAL DES AVENTURES — {section === "active" ? "EN COURS" : "ACHEVÉES"}
            </h2>
            <p className="font-crimson text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {activeQuests.length} quête{activeQuests.length !== 1 ? "s" : ""} active{activeQuests.length !== 1 ? "s" : ""}
              {" · "}
              {completedQuests.length} accomplie{completedQuests.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-14rem)] pr-2 custom-scrollbar">
        {section === "active" ? (
          <div className="space-y-3 pb-6">
            {activeQuests.length === 0 ? (
              <div className="game-card text-center py-10 opacity-50">
                <div className="text-3xl mb-3">📜</div>
                <p className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>
                  AUCUNE QUÊTE ACTIVE
                </p>
              </div>
            ) : (
              activeQuests.map((quest) => {
                const type = getQuestType(quest.questId);
                return (
                  <div key={quest.questId} className="game-card space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel px-1.5 py-0.5" style={{ fontSize: "0.42rem", color: type.color, background: "var(--surface-elevated)", border: `1px solid ${type.color}`, opacity: 0.9 }}>
                          {type.icon} {type.label.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-cinzel" style={{ fontSize: "0.42rem", color: "var(--text-muted)" }}>
                        {Math.round(quest.globalPct * 100)}%
                      </span>
                    </div>
                    <ProgressBar value={quest.globalPct} height="h-1.5" color="bg-amber-500" />
                    <div className="space-y-2">
                      {quest.objectives.map((obj, i) => {
                        const done = obj.current >= obj.required;
                        const pct = Math.min(1, obj.current / obj.required);
                        const label = OBJECTIVE_LABELS[obj.type] ?? obj.type;
                        return (
                          <div key={i} className="p-2.5" style={{ background: done ? "rgba(114,184,96,0.07)" : "var(--surface)", border: `1px solid ${done ? "rgba(114,184,96,0.3)" : "var(--border-subtle)"}` }}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-crimson text-sm" style={{ color: done ? "var(--color-heal)" : "var(--text-primary)" }}>{done ? "✓ " : ""}{label} {obj.target}</span>
                              <span className="font-cinzel" style={{ fontSize: "0.48rem", color: done ? "var(--color-heal)" : "var(--text-secondary)" }}>{obj.current}/{obj.required}</span>
                            </div>
                            <ProgressBar value={pct} height="h-1" color={done ? "bg-green-500" : "bg-amber-600"} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2 pb-6">
            {completedQuests.length === 0 ? (
              <div className="game-card text-center py-10 opacity-50">
                <div className="text-3xl mb-3">🏆</div>
                <p className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>AUCUN SUCCÈS DÉBLOQUÉ</p>
                <p className="font-crimson mt-2" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Accomplissez des quêtes pour les voir apparaître ici.</p>
              </div>
            ) : (
              completedQuests.map((quest) => {
                const type = getQuestType(quest.questId);
                return (
                  <div key={quest.questId} className="flex items-center gap-3 p-3 bg-[var(--surface-card)] border-2 border-[var(--border-default)]" style={{ borderLeft: `4px solid ${type.color}` }}>
                    <span className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, border: `2px solid ${type.color}`, background: "var(--surface-elevated)", fontSize: 18 }}>🏆</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-cinzel" style={{ fontSize: "0.45rem", color: type.color, letterSpacing: "0.1em" }}>{type.icon} {type.label.toUpperCase()}</div>
                      <div className="font-crimson text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>
                        {quest.objectives[0] ? `${OBJECTIVE_LABELS[quest.objectives[0].type] ?? quest.objectives[0].type} ${quest.objectives[0].target}` : quest.questId}
                      </div>
                    </div>
                    <span className="font-cinzel flex-shrink-0" style={{ fontSize: "0.6rem", color: "var(--gold-light)" }}>✓</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
