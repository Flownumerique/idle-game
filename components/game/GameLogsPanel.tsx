"use client";

import { useGameStore } from "@/stores/game-store";
import { useEffect, useState, useRef } from "react";

interface LogEntry {
  type: string;
  message?: string;
  itemId?: string;
  dmg?: number;
  crit?: boolean;
  slot?: string;
  timestamp: number;
}

const LOG_COLORS: Record<string, string> = {
  player_hit: "text-red-400",
  monster_hit: "text-green-400", 
  player_death: "text-red-600 font-bold",
  monster_death: "text-yellow-400",
  loot: "text-amber-300",
  equipment_equipped: "text-blue-400",
  equipment_unequipped: "text-blue-300",
  item_crafted: "text-purple-400",
  skill_level: "text-cyan-400",
  achievement: "text-yellow-300 font-bold",
  quest: "text-emerald-400",
};

const LOG_ICONS: Record<string, string> = {
  player_hit: "⚔️",
  monster_hit: "🛡️",
  player_death: "💀",
  monster_death: "✨",
  loot: "💰",
  equipment_equipped: "👕",
  equipment_unequipped: "👕",
  item_crafted: "🔨",
  skill_level: "⬆️",
  achievement: "🏆",
  quest: "📜",
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("fr-FR", { 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit" 
  });
}

function formatLogMessage(entry: LogEntry): string {
  switch (entry.type) {
    case "player_hit":
      return `Vous infligez ${entry.dmg}${entry.crit ? " (CRIT!)" : ""} dégâts`;
    case "monster_hit":
      return `Vous subissez ${entry.dmg} dégâts`;
    case "player_death":
      return "Vous avez été vaincu!";
    case "monster_death":
      return "Monstre vaincu!";
    case "loot":
      return entry.itemId ? `Butin: ${entry.itemId}` : "Butin obtenu";
    case "equipment_equipped":
      return entry.itemId ? `Équipé: ${entry.itemId}` : "Objet équipé";
    case "equipment_unequipped":
      return entry.slot ? `Déséquipé: ${entry.slot}` : "Objet déséquipé";
    case "item_crafted":
      return entry.itemId ? `Craft: ${entry.itemId}` : "Objet crafté";
    case "skill_level":
      return entry.message || "Compétence améliorée!";
    case "achievement":
      return entry.message || "Succès débloqué!";
    case "quest":
      return entry.message || "Quête mise à jour";
    default:
      return entry.message || "Événement";
  }
}

export default function GameLogsPanel({ section = "all" }: { section?: "all" | "combat" | "loot" | "xp" }) {
  const { getLogs } = useGameStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const updateLogs = () => {
      const allLogs = getLogs(100);
      let filteredLogs = allLogs;

      if (section === "combat") {
        filteredLogs = allLogs.filter(log => ["player_hit", "monster_hit", "player_death", "monster_death"].includes(log.type));
      } else if (section === "loot") {
        filteredLogs = allLogs.filter(log => log.type === "loot");
      } else if (section === "xp") {
        filteredLogs = allLogs.filter(log => log.type === "skill_level");
      }

      setLogs(filteredLogs);
    };

    updateLogs();
    const interval = setInterval(updateLogs, 1000);
    return () => clearInterval(interval);
  }, [getLogs, section]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  return (
    <div className="space-y-4">
      <div className="game-card flex justify-between items-center">
        <div>
          <h2 className="section-title mb-1">Journal — {section.toUpperCase()}</h2>
          <p className="font-crimson text-sm text-[var(--text-muted)]">Historique des événements récents</p>
        </div>
        <div className="flex items-center gap-3 bg-[rgba(0,0,0,0.2)] px-3 py-1.5 rounded-sm border border-[var(--border-subtle)]">
          <label className="font-cinzel text-[0.45rem] text-slate-400 mt-0.5">AUTO-SCROLL</label>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4 accent-[var(--gold)]"
          />
        </div>
      </div>

      <div className="bg-[#0d1525] border-2 border-[var(--border-default)] rounded-sm p-4 h-96 overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
          <p className="text-slate-500 text-center italic font-crimson py-10">Aucun log récent pour cette catégorie</p>
        ) : (
          <div className="space-y-1">
            {logs.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                className={`text-sm flex items-start gap-2 ${LOG_COLORS[entry.type] || "text-slate-400"}`}
              >
                <span className="text-[0.6rem] text-slate-500 font-mono whitespace-nowrap pt-0.5 opacity-60">
                  [{formatTimestamp(entry.timestamp)}]
                </span>
                <span className="flex-shrink-0 text-xs">
                  {LOG_ICONS[entry.type] || "📝"}
                </span>
                <span className="flex-1 font-crimson text-sm leading-tight">
                  {formatLogMessage(entry)}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "LOGS TOTAUX", value: logs.length, color: "var(--text-primary)" },
          { label: "COMBATS", value: logs.filter(l => l.type.includes("hit")).length, color: "var(--color-damage)" },
          { label: "BUTINS", value: logs.filter(l => l.type === "loot").length, color: "var(--gold-light)" },
          { label: "NIVEAUX", value: logs.filter(l => l.type === "skill_level").length, color: "var(--color-magic)" },
        ].map((stat, i) => (
          <div key={i} className="game-card p-3 text-center">
            <div className="font-cinzel text-[0.4rem] text-slate-500 mb-1">{stat.label}</div>
            <div className="font-mono font-bold text-lg" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
