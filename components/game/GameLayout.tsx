"use client";

import { useState } from "react";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useGameStore } from "@/stores/game-store";
import { getLevelForXp, calculateGlobalLevels } from "@/lib/xp-calc";
import ResourceBar from "./ResourceBar";
import SkillDetailPage from "./SkillDetailPage";
import CombatPanel from "./CombatPanel";
import InventoryPanel from "./InventoryPanel";
import MarketPanel from "./MarketPanel";
import CharacterSheet from "./CharacterSheet";
import FarmingPanel from "./FarmingPanel";
import QuestTracker from "./QuestTracker";
import EncyclopediaPanel from "./EncyclopediaPanel";
import { PROFESSION_SKILL_IDS } from "@/types/game";
import type { SkillId } from "@/types/game";

type Tab = "skills" | "combat" | "inventory" | "farming" | "crafting" | "market" | "character" | "encyclopedia";

const TABS: { id: Tab; label: string; icon: string; minLevel?: number }[] = [
  { id: "skills",    label: "Métiers",    icon: "⚒️" },
  { id: "inventory", label: "Inventaire", icon: "🎒" },
  { id: "character", label: "Personnage", icon: "👤" },
  { id: "combat",    label: "Combat",     icon: "⚔️",  minLevel: 5 },
  { id: "farming",   label: "Agriculture",icon: "🌾",  minLevel: 15 },
  { id: "market",    label: "Marché",     icon: "🏪",  minLevel: 15 },
  { id: "encyclopedia", label: "Encyclopédie", icon: "📖", minLevel: 50 },
];

const SKILL_META: Record<string, { name: string; icon: string }> = {
  woodcutting: { name: "Bûcheronnage", icon: "🪓" },
  mining:      { name: "Minage",       icon: "⛏️" },
  fishing:     { name: "Pêche",        icon: "🎣" },
  farming:     { name: "Agriculture",  icon: "🌾" },
  smithing:    { name: "Forge",        icon: "🔨" },
  cooking:     { name: "Cuisine",      icon: "🍳" },
  alchemy:     { name: "Alchimie",     icon: "⚗️" },
};

export default function GameLayout() {
  useGameLoop();
  const [activeTab, setActiveTab] = useState<Tab>("skills");
  const [selectedSkill, setSelectedSkill] = useState<SkillId>(PROFESSION_SKILL_IDS[0]);

  const skills = useGameStore((s) => s.skills);
  const { totalLevel } = calculateGlobalLevels(skills);

  const visibleTabs = TABS.filter(tab => !tab.minLevel || totalLevel >= tab.minLevel);

  return (
    <div className="min-h-screen flex flex-col">
      <ResourceBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Quest Tracker Sidebar */}
        <QuestTracker />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab navigation */}
          <nav className="bg-[#16213e] border-b border-[#0f3460] px-4 flex-shrink-0">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "border-blue-400 text-blue-400 bg-blue-400/5"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/20"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          {activeTab === "skills" ? (
            /* Skills: sidebar + detail layout */
            <div className="flex-1 flex overflow-hidden">
              {/* Skills sidebar */}
              <aside className="w-52 flex-shrink-0 bg-[#0d1525] border-r border-[#0f3460] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {PROFESSION_SKILL_IDS.map((id) => {
                    const skillState = skills[id];
                    const level = getLevelForXp(skillState.xp);
                    const isActive = !!skillState.activeAction;
                    const isSelected = selectedSkill === id;
                    const meta = SKILL_META[id];

                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedSkill(id)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-center gap-3 ${
                          isSelected
                            ? "bg-[#1a2f5a] text-slate-100"
                            : "hover:bg-[#131f38] text-slate-300"
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{meta.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{meta.name}</div>
                          <div className="text-xs text-slate-500">Niv. {level}</div>
                        </div>
                        {isActive && (
                          <span className="text-green-400 text-xs animate-pulse flex-shrink-0">●</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Skill detail */}
              <main className="flex-1 overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto">
                  <SkillDetailPage
                    key={selectedSkill}
                    skillId={selectedSkill}
                    skillName={SKILL_META[selectedSkill].name}
                    skillIcon={SKILL_META[selectedSkill].icon}
                  />
                </div>
              </main>
            </div>
          ) : (
            <main className="flex-1 p-4 overflow-y-auto">
              {activeTab === "combat" && (
                <div className="max-w-4xl mx-auto">
                  <CombatPanel />
                </div>
              )}

              {activeTab === "inventory" && (
                <div className="max-w-2xl mx-auto">
                  <InventoryPanel />
                </div>
              )}

              {activeTab === "farming" && (
                <div className="max-w-2xl mx-auto">
                  <FarmingPanel />
                </div>
              )}

              {activeTab === "market" && (
                <div className="max-w-lg mx-auto">
                  <MarketPanel />
                </div>
              )}

              {activeTab === "character" && (
                <div className="max-w-lg mx-auto">
                  <CharacterSheet />
                </div>
              )}

              {activeTab === "encyclopedia" && (
                <div className="max-w-5xl mx-auto h-full">
                  <EncyclopediaPanel />
                </div>
              )}
            </main>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#16213e] border-t border-[#0f3460] px-4 py-2 text-xs text-slate-500 text-center z-10">
        Idle Realms — Sauvegarde automatique toutes les 30s
      </footer>
    </div>
  );
}
