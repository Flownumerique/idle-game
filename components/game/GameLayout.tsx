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
import EquipmentPanel from "./EquipmentPanel";
import PlantingPanel from "./PlantingPanel";
import FarmingPanel from "./FarmingPanel";
import EncyclopediaPanel from "./EncyclopediaPanel";
import QuestPanel from "./QuestPanel";
import GameLogsPanel from "./GameLogsPanel";
import { PROFESSION_SKILL_IDS } from "@/types/game";
import type { SkillId } from "@/types/game";
import type { Tab } from "@/types/tabs";

const TABS: { id: Tab; label: string; icon: string; minLevel?: number }[] = [
  { id: "skills",       label: "Métiers",      icon: "⚒️" },
  { id: "inventory",    label: "Inventaire",   icon: "🎒" },
  { id: "character",    label: "Personnage",   icon: "👤" },
  { id: "equipment",    label: "Équipement",   icon: "⚔️" },
  { id: "combat",       label: "Combat",       icon: "⚔️",  minLevel: 5  },
  { id: "planting",     label: "Plantation",   icon: "🌱",  minLevel: 1  },
  { id: "farming",      label: "Agriculture",  icon: "🌾",  minLevel: 1  },
  { id: "market",       label: "Marché",       icon: "🏪",  minLevel: 15 },
  { id: "encyclopedia", label: "Encyclopédie", icon: "📖",  minLevel: 50 },
  { id: "quests",       label: "Quêtes",       icon: "📜" },
  { id: "logs",         label: "Logs",         icon: "📝" },
];

const SKILL_META: Record<string, { name: string; icon: string }> = {
  woodcutting: { name: "Bûcheronnage", icon: "🪓" },
  mining:      { name: "Minage",       icon: "⛏️" },
  fishing:     { name: "Pêche",        icon: "🎣" },
  planting:    { name: "Plantation",   icon: "🌱" },
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--void)" }}>
      <ResourceBar onNavigate={(tab) => setActiveTab(tab as Tab)} />

      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar navigation desktop ─────────────────────────────── */}
        <nav
          className="hidden md:flex w-44 flex-shrink-0 flex-col"
          style={{ background: "var(--abyss)", borderRight: "2px solid var(--border-accent)" }}
        >
          <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            <div className="section-title mb-3 mt-1 px-1">Navigation</div>
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item ${activeTab === tab.id ? "active" : ""}`}
              >
                <span className="pixel-icon-sm">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="px-3 py-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <span className="font-cinzel" style={{ fontSize: "0.38rem", color: "var(--text-muted)" }}>
              ▸ SAUVEGARDE AUTO 30S
            </span>
          </div>
        </nav>

        {/* ── Contenu principal ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {activeTab === "skills" ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Sous-sidebar métiers */}
              <aside
                className="w-40 flex-shrink-0 overflow-y-auto"
                style={{ background: "var(--void)", borderRight: "2px solid var(--border-default)" }}
              >
                <div className="p-2 pt-3 space-y-0.5">
                  <div className="section-title mb-3 px-1">Métiers</div>
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
                        className="w-full text-left px-2 py-2 flex items-center gap-2 transition-colors"
                        style={{
                          background: isSelected ? "rgba(200,136,42,0.1)" : "transparent",
                          borderLeft: `3px solid ${isSelected ? "var(--gold)" : "transparent"}`,
                          color: isSelected ? "var(--gold-light)" : "var(--text-secondary)",
                        }}
                      >
                        <span className="pixel-icon-sm">{meta.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-cinzel truncate" style={{ fontSize: "0.45rem", color: isSelected ? "var(--gold-light)" : "var(--text-secondary)" }}>
                            {meta.name}
                          </div>
                          <div className="font-cinzel" style={{ fontSize: "0.38rem", color: "var(--text-muted)" }}>
                            LV.{level}
                          </div>
                        </div>
                        {isActive && (
                          <span className="pixel-blink" style={{ color: "var(--gold)", fontSize: "0.5rem" }}>▶</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
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
            <main className="flex-1 p-4 pb-20 md:pb-4 overflow-y-auto">
              {activeTab === "combat"       && <div className="max-w-4xl mx-auto"><CombatPanel /></div>}
              {activeTab === "inventory"    && <div className="max-w-2xl mx-auto"><InventoryPanel /></div>}
              {activeTab === "equipment"    && <div className="max-w-4xl mx-auto"><EquipmentPanel /></div>}
              {activeTab === "planting"     && <div className="max-w-2xl mx-auto"><PlantingPanel /></div>}
              {activeTab === "farming"      && <div className="max-w-2xl mx-auto"><FarmingPanel /></div>}
              {activeTab === "market"       && <div className="max-w-lg mx-auto"><MarketPanel /></div>}
              {activeTab === "character"    && <div className="max-w-lg mx-auto"><CharacterSheet /></div>}
              {activeTab === "encyclopedia" && <div className="max-w-5xl mx-auto h-full"><EncyclopediaPanel /></div>}
              {activeTab === "quests"       && <div className="max-w-2xl mx-auto"><QuestPanel /></div>}
              {activeTab === "logs"         && <div className="max-w-4xl mx-auto"><GameLogsPanel /></div>}
            </main>
          )}
        </div>
      </div>

      {/* ── Navigation mobile bas d'écran ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: "var(--abyss)",
          borderTop: "2px solid var(--border-accent)",
          boxShadow: "0 -2px 0 var(--void)",
        }}
      >
        {visibleTabs.slice(0, 5).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1"
              style={{
                color: isActive ? "var(--gold-light)" : "var(--text-secondary)",
                background: isActive ? "rgba(200,136,42,0.1)" : "transparent",
                borderTop: `2px solid ${isActive ? "var(--gold)" : "transparent"}`,
              }}
            >
              <span style={{ width: 28, height: 28, border: `2px solid ${isActive ? "var(--gold)" : "var(--border-default)"}`, background: isActive ? "rgba(200,136,42,0.12)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                {tab.icon}
              </span>
              <span className="font-cinzel" style={{ fontSize: "0.35rem" }}>
                {tab.label.slice(0, 6).toUpperCase()}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
