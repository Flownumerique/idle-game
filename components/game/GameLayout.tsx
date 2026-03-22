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
  
  // Sub-navigation states
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [combatSection, setCombatSection] = useState("map");
  const [characterSection, setCharacterSection] = useState("stats");
  const [marketSection, setMarketSection] = useState("sell");
  const [encyclopediaSection, setEncyclopediaSection] = useState("items");
  const [questsSection, setQuestsSection] = useState("active");
  const [logsSection, setLogsSection] = useState("all");

  const skills = useGameStore((s) => s.skills);
  const { totalLevel } = calculateGlobalLevels(skills);

  const visibleTabs = TABS.filter((t) => !t.minLevel || totalLevel >= t.minLevel);

  return (
    <div className="flex flex-col h-screen bg-black text-slate-100 overflow-hidden medieval-bg">
      {/* ── Top Navigation Bar (Desktop) ────────────────────────────── */}
      <header className="hidden md:flex items-center h-14 border-b-2 border-slate-800 bg-black/80 backdrop-blur-sm z-50 px-4 gap-6">
        <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
          <span className="text-2xl">⚔️</span>
          <h1 className="font-cinzel text-sm tracking-widest text-[var(--gold)]">IDLE REALMS</h1>
        </div>
        
        <nav className="flex items-center h-full gap-1 overflow-x-auto no-scrollbar">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-2 ${
                  isActive ? "border-[var(--gold)] bg-white/5 text-[var(--gold-light)]" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-cinzel text-[0.65rem] tracking-wider font-bold">{tab.label.toUpperCase()}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <ResourceBar onNavigate={setActiveTab} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar Gauche (Contenu adaptatif) ───────────────────────── */}
        <aside className="hidden md:flex flex-col w-64 border-r-2 border-slate-800 bg-[#070b13]/90 backdrop-blur-md">
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {/* Skills Sidebar */}
            {activeTab === "skills" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">MÉTIERS</div>
                {PROFESSION_SKILL_IDS.map((id) => {
                  const skillState = skills[id];
                  const level = getLevelForXp(skillState.xp);
                  const isWorking = !!skillState.activeAction;
                  const isSelected = selectedSkill === id;
                  const meta = SKILL_META[id];
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedSkill(id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${isSelected ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                    >
                      <span className={`text-xl ${isWorking ? "animate-pulse" : ""}`}>{meta.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-cinzel truncate font-bold" style={{ fontSize: "0.5rem" }}>
                          {meta.name.toUpperCase()}
                        </div>
                        <div className="font-mono text-[0.6rem] opacity-70">
                          NIV.{level}
                        </div>
                      </div>
                      {isWorking && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* Inventory Sidebar */}
            {activeTab === "inventory" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">FILTRES</div>
                {[
                  { id: "all", label: "TOUT", icon: "📦" },
                  { id: "resource", label: "RESSOURCES", icon: "💎" },
                  { id: "equipment", label: "ÉQUIPEMENT", icon: "⚔️" },
                  { id: "consumable", label: "CONSOMMABLES", icon: "🧪" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setInventoryFilter(f.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${inventoryFilter === f.id ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span>{f.icon}</span>
                    <span className="font-cinzel font-bold" style={{ fontSize: "0.5rem" }}>{f.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Combat Sidebar */}
            {activeTab === "combat" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">COMBAT</div>
                {[
                  { id: "map", label: "CARTE DU MONDE", icon: "🗺️" },
                  { id: "training", label: "ENTRAÎNEMENT", icon: "🎯" },
                  { id: "mastery", label: "MAÎTRISE", icon: "⚔️" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCombatSection(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${combatSection === s.id ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-cinzel font-bold" style={{ fontSize: "0.5rem" }}>{s.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Character Sidebar */}
            {activeTab === "character" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">HÉROS</div>
                {[
                  { id: "stats", label: "STATISTIQUES", icon: "📊" },
                  { id: "milestones", label: "HAUTS FAITS", icon: "🏆" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCharacterSection(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${characterSection === s.id ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-cinzel font-bold" style={{ fontSize: "0.5rem" }}>{s.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Market Sidebar */}
            {activeTab === "market" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">MARCHÉ</div>
                {[
                  { id: "sell", label: "VENDRE", icon: "💰" },
                  { id: "buy", label: "ACHETER", icon: "🛒" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setMarketSection(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${marketSection === s.id ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-cinzel font-bold" style={{ fontSize: "0.5rem" }}>{s.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Encyclopedia Sidebar */}
            {activeTab === "encyclopedia" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">ARCHIVES</div>
                {[
                  { id: "items", label: "OBJETS", icon: "💍" },
                  { id: "monsters", label: "BESTIAIRE", icon: "🐉" },
                  { id: "zones", label: "LÉGENDES", icon: "🗺️" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setEncyclopediaSection(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${encyclopediaSection === s.id ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-cinzel font-bold" style={{ fontSize: "0.5rem" }}>{s.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Quests Sidebar */}
            {activeTab === "quests" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">AVENTURES</div>
                {[
                  { id: "active", label: "EN COURS", icon: "📜" },
                  { id: "completed", label: "ACHEVÉES", icon: "🏆" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setQuestsSection(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${questsSection === s.id ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-cinzel font-bold" style={{ fontSize: "0.5rem" }}>{s.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Logs Sidebar */}
            {activeTab === "logs" && (
              <>
                <div className="section-title mb-3 px-1 text-[var(--gold)]">HISTORIQUE</div>
                {[
                  { id: "all", label: "TOUS LES ÉVÉNEMENTS", icon: "📝" },
                  { id: "combat", label: "COMBATS", icon: "⚔️" },
                  { id: "loot", label: "BUTINS", icon: "💰" },
                  { id: "xp", label: "NIVEAUX", icon: "⬆️" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setLogsSection(s.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all mb-1 border rounded-sm ${logsSection === s.id ? "bg-[var(--gold)]/5 border-[var(--gold)]/30 text-[var(--gold-light)]" : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    <span>{s.icon}</span>
                    <span className="font-cinzel font-bold" style={{ fontSize: "0.5rem" }}>{s.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
          
          <div className="mt-auto px-4 py-3 bg-black/40 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-cinzel text-[0.4rem] text-slate-500 tracking-wider">SAUVEGARDE AUTO ACTIVE</span>
            </div>
          </div>
        </aside>

        {/* ── Contenu principal ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 min-w-0 custom-scrollbar">
          <div className="max-w-5xl mx-auto h-full">
            {activeTab === "skills" && (
              selectedSkill === "planting" ? (
                <PlantingPanel />
              ) : selectedSkill === "farming" ? (
                <FarmingPanel />
              ) : (
                <SkillDetailPage
                  key={selectedSkill}
                  skillId={selectedSkill}
                  skillName={SKILL_META[selectedSkill].name}
                  skillIcon={SKILL_META[selectedSkill].icon}
                />
              )
            )}
            
            {activeTab === "inventory" && <InventoryPanel filter={inventoryFilter as any} />}
            {activeTab === "combat" && <CombatPanel section={combatSection as any} />}
            {activeTab === "character" && <CharacterSheet section={characterSection as any} />}
            
            {activeTab === "equipment"    && <EquipmentPanel />}
            {activeTab === "market"       && <MarketPanel section={marketSection as any} />}
            {activeTab === "encyclopedia" && <EncyclopediaPanel section={encyclopediaSection as any} />}
            {activeTab === "quests"       && <QuestPanel section={questsSection as any} />}
            {activeTab === "logs"         && <GameLogsPanel section={logsSection as any} />}

            {/* Backwards compatibility for top-level planting/farming if tabs are clicked directly */}
            {activeTab === "planting"     && <PlantingPanel />}
            {activeTab === "farming"      && <FarmingPanel />}
          </div>
        </main>
      </div>

      {/* ── Navigation mobile bas d'écran ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-[#070b13] border-t-2 border-[var(--gold)] shadow-[0_-4px_20px_rgba(0,0,0,0.8)]"
      >
        <div className="flex w-full overflow-x-auto no-scrollbar">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0 flex flex-col items-center justify-center px-4 min-w-[70px] transition-all relative"
                style={{
                  color: isActive ? "var(--gold-light)" : "var(--text-secondary)",
                  background: isActive ? "rgba(200,136,42,0.12)" : "transparent",
                }}
              >
                {isActive && <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--gold)]" />}
                <span className="text-xl mb-0.5">{tab.icon}</span>
                <span className="font-cinzel font-bold" style={{ fontSize: "0.4rem" }}>
                  {tab.label.slice(0, 8).toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
