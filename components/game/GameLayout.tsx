"use client";

import { useState } from "react";
import { useGameLoop } from "@/hooks/useGameLoop";
import ResourceBar from "./ResourceBar";
import SkillPanel from "./SkillPanel";
import CombatPanel from "./CombatPanel";
import InventoryPanel from "./InventoryPanel";
import MarketPanel from "./MarketPanel";
import type { SkillId } from "@/types/game";

type Tab = "skills" | "combat" | "inventory" | "market";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "skills", label: "Métiers", icon: "⚒️" },
  { id: "combat", label: "Combat", icon: "⚔️" },
  { id: "inventory", label: "Inventaire", icon: "🎒" },
  { id: "market", label: "Marché", icon: "🏪" },
];

const SKILL_IDS: SkillId[] = [
  "woodcutting",
  "mining",
  "fishing",
  "farming",
  "smithing",
  "cooking",
  "alchemy",
];

export default function GameLayout() {
  useGameLoop();
  const [activeTab, setActiveTab] = useState<Tab>("skills");

  return (
    <div className="min-h-screen flex flex-col">
      <ResourceBar />

      {/* Tab navigation */}
      <nav className="bg-[#16213e] border-b border-[#0f3460] px-4">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-400 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === "skills" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SKILL_IDS.map((id) => (
              <SkillPanel key={id} skillId={id} />
            ))}
          </div>
        )}

        {activeTab === "combat" && (
          <div className="max-w-lg mx-auto">
            <CombatPanel />
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="max-w-2xl mx-auto">
            <InventoryPanel />
          </div>
        )}

        {activeTab === "market" && (
          <div className="max-w-lg mx-auto">
            <MarketPanel />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#16213e] border-t border-[#0f3460] px-4 py-2 text-xs text-slate-500 text-center">
        Idle Realms — Sauvegarde automatique toutes les 30s
      </footer>
    </div>
  );
}
