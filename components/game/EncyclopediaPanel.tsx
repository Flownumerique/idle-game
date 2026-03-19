"use client";

import { useGameStore } from "@/stores/game-store";
import itemsData from "@/items.json";

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

export default function EncyclopediaPanel() {
  const discoveredItems = useGameStore((s) => s.discoveredItems) || [];

  // Group items by category (with sub-categories for resource)
  const itemsByCategory: Record<string, any[]> = {};
  for (const item of (itemsData as any).items) {
    let cat = item.category;
    // Sub-categorize resource for better visibility
    if (cat === "resource") {
      if (item.id.startsWith("wood_")) cat = "wood";
      else if (item.id.startsWith("fish_")) cat = "fish";
      else if (item.id.startsWith("ore_")) cat = "ore";
    }
    
    if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
    itemsByCategory[cat].push(item);
  }

  // Calculate overall progress
  const totalItems = (itemsData as any).items.length;
  const discoveredCount = discoveredItems.length;
  const progressPct = totalItems > 0 ? (discoveredCount / totalItems) * 100 : 0;

  return (
    <div className="game-card flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-end justify-between border-b border-slate-700 pb-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span>📖</span> Encyclopédie
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Recensement de tous les objets, matériaux, et équipements du jeu.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-blue-400">{discoveredCount} / {totalItems}</div>
          <div className="text-xs text-slate-500">Découvert ({progressPct.toFixed(1)}%)</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-8 pb-10">
        {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
          const catItems = itemsByCategory[catKey] || [];
          if (catItems.length === 0) return null;
          
          const catDiscovered = catItems.filter(i => discoveredItems.includes(i.id)).length;

          return (
            <div key={catKey}>
              <h3 className="text-lg font-bold text-slate-300 mb-4 border-l-4 border-blue-500 pl-3 flex items-center justify-between">
                <span>{catLabel}</span>
                <span className="text-sm font-normal text-slate-500">{catDiscovered} / {catItems.length}</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {catItems.map((item) => {
                  const isDiscovered = discoveredItems.includes(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className={`relative p-3 rounded border flex flex-col items-center text-center transition-all h-full ${
                        isDiscovered 
                          ? "bg-[#16213e] border-slate-600 hover:border-blue-400" 
                          : "bg-[#0d1525] border-slate-800 opacity-70"
                      }`}
                    >
                      {isDiscovered && (
                         <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1a1a2e] z-10 font-bold shadow-black/50 shadow-sm">
                           ✓
                         </div>
                      )}
                      
                      <div className={`text-4xl mb-2 ${!isDiscovered ? "grayscale opacity-30 select-none" : ""}`}>
                        {isDiscovered ? (item.icon || "📦") : "❓"}
                      </div>
                      
                      <div className={`font-semibold text-sm mb-1 leading-tight ${isDiscovered ? "text-slate-200" : "text-slate-600"}`}>
                        {isDiscovered ? item.name : "Inconnu"}
                      </div>
                      
                      {isDiscovered && item.description && (
                        <div className="text-[10px] text-slate-400 flex-1 flex flex-col justify-end mt-2 leading-tight">
                          {item.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
