"use client";

import { useState, useRef, useEffect } from "react";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useUnlocks } from "@/hooks/useUnlocks";
import { useSynergyDiscovery } from "@/hooks/useSynergyDiscovery";
import { useClassSynergy } from "@/hooks/useClassSynergy";
import ActiveGoals from "./ActiveGoals";
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
import FloatingReward from "./FloatingReward";
import { PROFESSION_SKILL_IDS } from "@/types/game";
import type { SkillId } from "@/types/game";
import type { Tab } from "@/types/tabs";

const TABS: { id: Tab; label: string; icon: string; minLevel?: number }[] = [
  { id: "skills", label: "Métiers", icon: "⚒️" },
  { id: "inventory", label: "Inventaire", icon: "🎒" },
  { id: "character", label: "Personnage", icon: "👤" },
  { id: "equipment", label: "Équipement", icon: "⚔️" },
  { id: "combat", label: "Combat", icon: "⚔️", minLevel: 5 },
  { id: "planting", label: "Plantation", icon: "🌱", minLevel: 1 },
  { id: "farming", label: "Agriculture", icon: "🌾", minLevel: 1 },
  { id: "market", label: "Marché", icon: "🏪", minLevel: 15 },
  { id: "encyclopedia", label: "Encyclopédie", icon: "📖", minLevel: 50 },
  { id: "quests", label: "Quêtes", icon: "📜" },
  { id: "logs", label: "Logs", icon: "📝" },
];

const SKILL_META: Record<string, { name: string; icon: string }> = {
  woodcutting: { name: "Bûcheronnage", icon: "🪓" },
  mining: { name: "Minage", icon: "⛏️" },
  fishing: { name: "Pêche", icon: "🎣" },
  planting: { name: "Plantation", icon: "🌱" },
  farming: { name: "Agriculture", icon: "🌾" },
  smithing: { name: "Forge", icon: "🔨" },
  cooking: { name: "Cuisine", icon: "🍳" },
  alchemy: { name: "Alchimie", icon: "⚗️" },
};

export default function GameLayout() {
  useGameLoop();
  useUnlocks();
  useSynergyDiscovery();
  useClassSynergy();
  const [activeTab, setActiveTab] = useState<Tab>("skills");
  const [selectedSkill, setSelectedSkill] = useState<SkillId>(
    PROFESSION_SKILL_IDS[0]
  );

  // Sub-navigation states
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [combatSection, setCombatSection] = useState("map");
  const [characterSection, setCharacterSection] = useState("stats");
  const [marketSection, setMarketSection] = useState("sell");
  const [encyclopediaSection, setEncyclopediaSection] = useState("items");
  const [questsSection, setQuestsSection] = useState("active");
  const [logsSection, setLogsSection] = useState("all");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const bottomNavRef = useRef<HTMLElement>(null);

  const skills = useGameStore((s) => s.skills);
  const { totalLevel } = calculateGlobalLevels(skills);

  const visibleTabs = TABS.filter(
    (t) => !t.minLevel || totalLevel >= t.minLevel
  );

  // Helper to render the appropriate sub-navigation based on active tab
  const renderSubNavContent = () => {
    switch (activeTab) {
      case "skills":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">MÉTIERS</div>
            <div className="flex flex-col gap-1 md:gap-1">
              {PROFESSION_SKILL_IDS.map((id) => {
                const skillState = skills[id];
                const level = getLevelForXp(skillState.xp);
                const isWorking = !!skillState.activeAction;
                const isSelected = selectedSkill === id;
                const meta = SKILL_META[id];
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedSkill(id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                      isSelected
                        ? "bg-gold/5 border-gold/30 text-gold-light"
                        : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                    }`}
                  >
                    <span
                      className={`text-2xl md:text-xl ${
                        isWorking ? "animate-pulse" : ""
                      }`}
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-cinzel truncate font-bold text-xs md:text-[0.5rem]">
                        {meta.name.toUpperCase()}
                      </div>
                      <div className="font-mono text-xs md:text-[0.6rem] opacity-70">
                        NIV.{level}
                      </div>
                    </div>
                    {isWorking && (
                      <div className="w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-heal shadow-[0_0_8px_rgba(114,184,96,0.6)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        );

      case "inventory":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">FILTRES</div>
            <div className="flex flex-col gap-1 md:gap-1">
              {[
                { id: "all", label: "TOUT", icon: "📦" },
                { id: "resource", label: "RESSOURCES", icon: "💎" },
                { id: "equipment", label: "ÉQUIPEMENT", icon: "⚔️" },
                { id: "consumable", label: "CONSOMMABLES", icon: "🧪" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setInventoryFilter(f.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                    inventoryFilter === f.id
                      ? "bg-gold/5 border-gold/30 text-gold-light"
                      : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl md:text-xl">{f.icon}</span>
                  <span className="font-cinzel font-bold text-xs md:text-[0.5rem]">
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "combat":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">COMBAT</div>
            <div className="flex flex-col gap-1 md:gap-1">
              {[
                { id: "map", label: "CARTE DU MONDE", icon: "🗺️" },
                { id: "training", label: "ENTRAÎNEMENT", icon: "🎯" },
                { id: "mastery", label: "MAÎTRISE", icon: "⚔️" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCombatSection(s.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                    combatSection === s.id
                      ? "bg-gold/5 border-gold/30 text-gold-light"
                      : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl md:text-xl">{s.icon}</span>
                  <span className="font-cinzel font-bold text-xs md:text-[0.5rem]">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "character":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">HÉROS</div>
            <div className="flex flex-col gap-1 md:gap-1">
              {[
                { id: "stats",      label: "STATISTIQUES",  icon: "📊" },
                { id: "milestones", label: "HAUTS FAITS",   icon: "🏆" },
                { id: "synergies",  label: "SYNERGIES",     icon: "✦"  },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCharacterSection(s.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                    characterSection === s.id
                      ? "bg-gold/5 border-gold/30 text-gold-light"
                      : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl md:text-xl">{s.icon}</span>
                  <span className="font-cinzel font-bold text-xs md:text-[0.5rem]">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "market":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">MARCHÉ</div>
            <div className="flex flex-col gap-1 md:gap-1">
              {[
                { id: "sell", label: "VENDRE", icon: "💰" },
                { id: "buy", label: "ACHETER", icon: "🛒" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setMarketSection(s.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                    marketSection === s.id
                      ? "bg-gold/5 border-gold/30 text-gold-light"
                      : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl md:text-xl">{s.icon}</span>
                  <span className="font-cinzel font-bold text-xs md:text-[0.5rem]">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "encyclopedia":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">ARCHIVES</div>
            <div className="flex flex-col gap-1 md:gap-1">
              {[
                { id: "items", label: "OBJETS", icon: "💍" },
                { id: "monsters", label: "BESTIAIRE", icon: "🐉" },
                { id: "zones", label: "LÉGENDES", icon: "🗺️" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setEncyclopediaSection(s.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                    encyclopediaSection === s.id
                      ? "bg-gold/5 border-gold/30 text-gold-light"
                      : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl md:text-xl">{s.icon}</span>
                  <span className="font-cinzel font-bold text-xs md:text-[0.5rem]">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "quests":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">AVENTURES</div>
            <div className="flex flex-col gap-1 md:gap-1">
              {[
                { id: "active", label: "EN COURS", icon: "📜" },
                { id: "completed", label: "ACHEVÉES", icon: "🏆" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setQuestsSection(s.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                    questsSection === s.id
                      ? "bg-gold/5 border-gold/30 text-gold-light"
                      : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl md:text-xl">{s.icon}</span>
                  <span className="font-cinzel font-bold text-xs md:text-[0.5rem]">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "logs":
        return (
          <>
            <div className="section-title mb-3 px-1 text-gold">
              HISTORIQUE
            </div>
            <div className="flex flex-col gap-1 md:gap-1">
              {[
                { id: "all", label: "TOUS LES ÉVÉNEMENTS", icon: "📝" },
                { id: "combat", label: "COMBATS", icon: "⚔️" },
                { id: "loot", label: "BUTINS", icon: "💰" },
                { id: "xp", label: "NIVEAUX", icon: "⬆️" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setLogsSection(s.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 md:px-3 md:py-2.5 flex items-center gap-4 md:gap-3 transition-all border rounded-sm ${
                    logsSection === s.id
                      ? "bg-gold/5 border-gold/30 text-gold-light"
                      : "bg-transparent border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl md:text-xl">{s.icon}</span>
                  <span className="font-cinzel font-bold text-xs md:text-[0.5rem]">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const hasSubNav = [
    "skills",
    "inventory",
    "combat",
    "character",
    "market",
    "encyclopedia",
    "quests",
    "logs",
  ].includes(activeTab);

  const getMobileMenuLabel = () => {
    switch (activeTab) {
      case "skills":
        return `Métier: ${SKILL_META[selectedSkill]?.name || ""}`;
      case "inventory":
        return `Filtre: ${
          inventoryFilter === "all"
            ? "Tout"
            : inventoryFilter === "resource"
            ? "Ressources"
            : inventoryFilter === "equipment"
            ? "Équipement"
            : "Consommables"
        }`;
      case "combat":
        return `Combat: ${
          combatSection === "map"
            ? "Carte"
            : combatSection === "training"
            ? "Entraînement"
            : "Maîtrise"
        }`;
      case "character":
        return `Héros: ${
          characterSection === "stats" ? "Statistiques" : characterSection === "synergies" ? "Synergies" : "Hauts Faits"
        }`;
      case "market":
        return `Marché: ${marketSection === "sell" ? "Vendre" : "Acheter"}`;
      case "encyclopedia":
        return `Archives: ${
          encyclopediaSection === "items"
            ? "Objets"
            : encyclopediaSection === "monsters"
            ? "Bestiaire"
            : "Légendes"
        }`;
      case "quests":
        return `Quêtes: ${
          questsSection === "active" ? "En cours" : "Achevées"
        }`;
      case "logs":
        return `Logs: ${
          logsSection === "all"
            ? "Tous"
            : logsSection === "combat"
            ? "Combats"
            : logsSection === "loot"
            ? "Butins"
            : "Niveaux"
        }`;
      default:
        return "Menu";
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-void text-text-primary overflow-hidden">
      <FloatingReward />
      {/* ── Top Navigation Bar (Desktop) ────────────────────────────── */}
      <header className="hidden md:flex items-center h-14 border-b-2 border-border-subtle bg-black/80 backdrop-blur-sm z-50 px-6 gap-8">
        <div className="flex items-center gap-3 pr-6 border-r-2 border-border-subtle h-8">
          <span className="text-2xl">⚔️</span>
          <h1 className="font-cinzel text-sm tracking-[0.2em] text-gold font-bold">
            IDLE REALMS
          </h1>
        </div>

        <nav className="flex items-center h-full gap-2 overflow-x-auto no-scrollbar flex-1">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 h-full px-4 transition-all border-b-[3px] ${
                  isActive
                    ? "border-gold bg-white/5 text-gold-light"
                    : "border-transparent text-text-muted hover:text-text-secondary hover:bg-white/5"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-cinzel text-[0.65rem] tracking-wider font-bold">
                  {tab.label.toUpperCase()}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <ResourceBar onNavigate={setActiveTab} />
        </div>
      </header>

      {/* ── Mobile Top Bar (Resource Bar & Logo) ────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between p-3 border-b-2 border-border-subtle bg-black/80 backdrop-blur-sm z-40 h-14 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <span className="text-xl">⚔️</span>
          <h1 className="font-cinzel text-[0.6rem] tracking-[0.1em] text-gold font-bold truncate">
            IDLE REALMS
          </h1>
        </div>
        <div className="scale-[0.85] origin-right ml-2">
          <ResourceBar onNavigate={setActiveTab} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Sidebar Gauche (Contenu adaptatif) - DESKTOP ONLY ─────── */}
        <aside className="hidden md:flex flex-col w-64 border-r-2 border-border-subtle bg-abyss/90 backdrop-blur-md">
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {renderSubNavContent()}
          </div>

          <div className="mt-auto px-4 py-3 bg-black/40 border-t border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-heal animate-pulse shadow-[0_0_8px_rgba(114,184,96,0.5)]" />
              <span className="font-cinzel text-[0.4rem] text-text-muted tracking-wider font-bold">
                SAUVEGARDE AUTO ACTIVE
              </span>
            </div>
          </div>
        </aside>

        {/* ── Contenu principal ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-6 min-w-0 custom-scrollbar relative">
          {/* Mobile Sub-nav Trigger FAB / Sticky Button */}
          {hasSubNav && (
            <div className="md:hidden mb-4 sticky -top-4 z-30 flex justify-center w-[calc(100%+2rem)] shadow-md bg-void/80 backdrop-blur py-2 -mx-4 px-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="game-card !py-2 !px-4 flex items-center gap-3 w-full max-w-[280px] justify-between shadow-lg bg-surface-elevated/95 backdrop-blur-sm border-gold/50 text-gold-light mx-auto"
              >
                <span className="font-cinzel text-xs tracking-wider font-bold truncate">
                  {getMobileMenuLabel().toUpperCase()}
                </span>
                <span className="text-sm">▼</span>
              </button>
            </div>
          )}

          <div className="max-w-5xl mx-auto h-full">
            {activeTab === "skills" &&
              (selectedSkill === "planting" ? (
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
              ))}

            {activeTab === "inventory" && (
              <InventoryPanel filter={inventoryFilter as any} />
            )}
            {activeTab === "combat" && (
              <CombatPanel section={combatSection as any} />
            )}
            {activeTab === "character" && (
              <CharacterSheet section={characterSection as any} />
            )}

            {activeTab === "equipment" && <EquipmentPanel />}
            {activeTab === "market" && (
              <MarketPanel section={marketSection as any} />
            )}
            {activeTab === "encyclopedia" && (
              <EncyclopediaPanel section={encyclopediaSection as any} onNavigate={(tab) => setActiveTab(tab as Tab)} />
            )}
            {activeTab === "quests" && (
              <QuestPanel section={questsSection as any} />
            )}
            {activeTab === "logs" && (
              <GameLogsPanel section={logsSection as any} />
            )}

            {/* Backwards compatibility for top-level planting/farming if tabs are clicked directly */}
            {activeTab === "planting" && <PlantingPanel />}
            {activeTab === "farming" && <FarmingPanel />}
          </div>
        </main>

        {/* ── Sidebar droite — Objectifs actifs (xl+ only) ─────────────── */}
        <aside className="hidden xl:flex flex-col w-52 border-l-2 border-border-subtle bg-abyss/90 backdrop-blur-md">
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <ActiveGoals
              onNavigate={(tab, section) => {
                setActiveTab(tab as Tab);
                if (tab === "character" && section) setCharacterSection(section);
              }}
            />
          </div>
        </aside>
      </div>

      {/* ── Navigation mobile bas d'écran ───────────────────────────── */}
      <nav
        ref={bottomNavRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-abyss border-t-2 border-border-gold shadow-[0_-4px_20px_rgba(0,0,0,0.8)] pb-safe"
      >
        <div className="flex w-full overflow-x-auto no-scrollbar snap-x scroll-smooth">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  setActiveTab(tab.id);
                  const nav = bottomNavRef.current;
                  if (nav) {
                    const btn = e.currentTarget;
                    // Scroll to center
                    const scrollLeft = btn.offsetLeft - (nav.clientWidth / 2) + (btn.clientWidth / 2);
                    nav.querySelector('div')?.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                  }
                }}
                className="flex-shrink-0 flex flex-col items-center justify-center px-4 min-w-[76px] transition-all relative snap-start"
                style={{
                  color: isActive
                    ? "var(--gold-light)"
                    : "var(--text-secondary)",
                  background: isActive ? "rgba(200,136,42,0.12)" : "transparent",
                }}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gold" />
                )}
                <span className="text-xl mb-0.5">{tab.icon}</span>
                <span className="font-cinzel font-bold text-[0.45rem] tracking-wider">
                  {tab.label.slice(0, 8).toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile Sub-navigation Bottom Sheet Modal ────────────────── */}
      {isMobileMenuOpen && hasSubNav && (
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-surface border-t-[3px] border-gold w-full max-h-[75vh] flex flex-col rounded-t-2xl shadow-2xl animate-[fade-in-up_0.25s_ease-out]">
            {/* Pull indicator */}
            <div className="w-full flex justify-center pt-3 pb-2" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="w-12 h-1.5 bg-border-default rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 border-b-2 border-border-subtle">
              <h2 className="font-cinzel text-[0.7rem] text-gold-light tracking-widest font-bold">
                {getMobileMenuLabel().split(':')[0].toUpperCase()}
              </h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-elevated text-text-muted hover:text-text-primary border border-border-default font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4 custom-scrollbar pb-10">
              {renderSubNavContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
