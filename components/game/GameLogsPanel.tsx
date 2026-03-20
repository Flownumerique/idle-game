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

export default function GameLogsPanel() {
  const { getLogs } = useGameStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const updateLogs = () => {
      const allLogs = getLogs(100);
      const filteredLogs = filter === "all" 
        ? allLogs 
        : allLogs.filter(log => log.type === filter);
      setLogs(filteredLogs);
    };

    updateLogs();
    const interval = setInterval(updateLogs, 1000);
    return () => clearInterval(interval);
  }, [getLogs, filter]);

  const logTypes = Array.from(new Set(logs.map(log => log.type)));
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#16213e] p-4 rounded-lg border border-[#0f3460]">
        <div>
          <h2 className="text-xl font-bold text-slate-200">Logs du Jeu</h2>
          <p className="text-sm text-slate-400">Historique des événements récents</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Auto-scroll:</label>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4"
          />
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-[#0f3460] text-slate-400 hover:bg-[#1a4d7a]"
          }`}
        >
          Tous
        </button>
        {logTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
              filter === type
                ? "bg-blue-600 text-white"
                : "bg-[#0f3460] text-slate-400 hover:bg-[#1a4d7a]"
            }`}
          >
            <span>{LOG_ICONS[type] || "📝"}</span>
            {type}
          </button>
        ))}
      </div>

      {/* Logs */}
      <div className="bg-[#0d1525] border border-[#0f3460] rounded-lg p-4 h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-slate-500 text-center italic">Aucun log récent</p>
        ) : (
          <div className="space-y-1">
            {logs.map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                className={`text-sm flex items-start gap-2 ${LOG_COLORS[entry.type] || "text-slate-400"}`}
              >
                <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <span className="flex-shrink-0">
                  {LOG_ICONS[entry.type] || "📝"}
                </span>
                <span className="flex-1">
                  {formatLogMessage(entry)}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#16213e] p-3 rounded border border-[#0f3460]">
          <div className="text-2xl font-bold text-slate-200">{logs.length}</div>
          <div className="text-xs text-slate-400">Logs totaux</div>
        </div>
        <div className="bg-[#16213e] p-3 rounded border border-[#0f3460]">
          <div className="text-2xl font-bold text-red-400">
            {logs.filter(l => l.type.includes("hit")).length}
          </div>
          <div className="text-xs text-slate-400">Actions combat</div>
        </div>
        <div className="bg-[#16213e] p-3 rounded border border-[#0f3460]">
          <div className="text-2xl font-bold text-amber-300">
            {logs.filter(l => l.type === "loot").length}
          </div>
          <div className="text-xs text-slate-400">Butins</div>
        </div>
        <div className="bg-[#16213e] p-3 rounded border border-[#0f3460]">
          <div className="text-2xl font-bold text-purple-400">
            {logs.filter(l => l.type === "item_crafted").length}
          </div>
          <div className="text-xs text-slate-400">Crafts</div>
        </div>
      </div>
    </div>
  );
}
