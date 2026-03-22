"use client";

import { useGameStore } from "@/stores/game-store";
import itemsData from "@/items.json";
import zonesData from "@/zones_monsters.json";

// We define the Category mapping for nice display
const CATEGORY_LABELS: Record<string, string> = {
  resource: "Ressources Brutes",
  wood: "Bücheronnage",
  fish: "Pêche",
  ore: "Minerais",
  material: "Matériaux",
  consumable: "Consommables",
  equipment: "Équipements",
  seed: "Graines",
  currency: "Monnaies",
};

export default function EncyclopediaPanel({ section = "items" }: { section?: "items" | "monsters" | "zones" }) {
  const discoveredItems = useGameStore((s) => s.discoveredItems) || [];
  const zoneKills = useGameStore((s) => s.zoneKills) || {};

  // Group items by category (with sub-categories for resource)
  const itemsByCategory: Record<string, any[]> = {};
  for (const item of (itemsData as any).items) {
    let cat = item.category;
    if (cat === "resource") {
      if (item.id.startsWith("wood_")) cat = "wood";
      else if (item.id.startsWith("fish_")) cat = "fish";
      else if (item.id.startsWith("ore_")) cat = "ore";
    }
    if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
    itemsByCategory[cat].push(item);
  }

  const renderItems = () => (
    <div className="space-y-8 pb-10">
      {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
        const catItems = itemsByCategory[catKey] || [];
        if (catItems.length === 0) return null;
        const catDiscovered = catItems.filter(i => discoveredItems.includes(i.id)).length;
        return (
          <div key={catKey}>
            <h3 className="section-title mb-4 flex justify-between items-center">
              <span>{catLabel}</span>
              <span className="text-xs font-normal text-slate-500">{catDiscovered} / {catItems.length}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {catItems.map((item) => {
                const isDiscovered = discoveredItems.includes(item.id);
                return (
                  <div key={item.id} className={`relative p-3 rounded-sm border flex flex-col items-center text-center transition-all h-full ${isDiscovered ? "bg-[#16213e] border-slate-600" : "bg-[#0d1525] border-slate-800 opacity-70"}`}>
                    <div className={`text-4xl mb-2 ${!isDiscovered ? "grayscale opacity-30 select-none" : ""}`}>
                      {isDiscovered ? (item.icon || "📦") : "❓"}
                    </div>
                    <div className={`font-cinzel text-[0.55rem] tracking-wide mb-1 leading-tight ${isDiscovered ? "text-slate-200" : "text-slate-600"}`}>
                      {isDiscovered ? item.name : "INCONNU"}
                    </div>
                    {isDiscovered && item.description && (
                      <div className="font-crimson text-[10px] text-slate-400 mt-2 leading-tight italic">"{item.description}"</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMonsters = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
      {zonesData.monsters.map((m) => {
        const isDiscovered = true; // For now everything is visible in bestiary
        return (
          <div key={m.id} className="game-card flex gap-4 items-center">
            <span className="text-4xl">{m.icon || "👾"}</span>
            <div>
              <div className="font-cinzel text-xs font-bold text-[var(--gold-light)]">{m.name}</div>
              <div className="font-mono text-[0.6rem] text-slate-400">❤️ {m.stats.hp} ⚔️ {m.stats.attack} 🛡️ {m.stats.defense}</div>
              <div className="font-crimson text-[10px] text-slate-500 mt-1 italic leading-tight">{m.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderZones = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
      {zonesData.zones.map((z) => {
        const kills = zoneKills[z.id] || 0;
        return (
          <div key={z.id} className="game-card space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{z.icon || "🌍"}</span>
              <div>
                <div className="font-cinzel text-xs font-bold text-[var(--gold-light)]">{z.name}</div>
                <div className="font-mono text-[0.6rem] text-slate-400">Kills: {kills}</div>
              </div>
            </div>
            <div className="font-crimson text-[11px] text-slate-300 italic leading-relaxed">"{z.description}"</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="game-card">
        <h2 className="section-title mb-1 flex items-center gap-2">
          <span>📖</span> Encyclopédie — {section.toUpperCase()}
        </h2>
        <p className="font-crimson text-sm text-[var(--text-muted)]">
          {section === "items" && "Recensement de tous les objets, matériaux, et équipements du jeu."}
          {section === "monsters" && "Catalogue des créatures rencontrées dans les différents royaumes."}
          {section === "zones" && "Archive des lieux explorés et de leurs secrets."}
        </p>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-14rem)] pr-2 custom-scrollbar">
        {section === "items" && renderItems()}
        {section === "monsters" && renderMonsters()}
        {section === "zones" && renderZones()}
      </div>
    </div>
  );
}
