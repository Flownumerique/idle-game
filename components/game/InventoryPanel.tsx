"use client";

import { useGameStore } from "@/stores/game-store";
import { formatNumber } from "@/lib/formatters";
import itemsData from "@/items.json";

interface ItemDef {
  id: string;
  name: string;
  rarity: string;
  category: string;
  icon?: string;
}

const itemsById = new Map<string, ItemDef>();
for (const item of (itemsData as { items: ItemDef[] }).items) {
  itemsById.set(item.id, item);
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

export default function InventoryPanel() {
  const { inventory, gold } = useGameStore((s) => ({
    inventory: s.inventory,
    gold: s.gold,
  }));

  const entries = Object.entries(inventory).filter(([, qty]) => qty > 0);

  return (
    <div className="game-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <span>🎒</span> Inventaire
        </h3>
        <span className="text-gold text-sm font-bold">🪙 {formatNumber(gold)}</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Inventaire vide — commencez à collecter !</p>
      ) : (
        <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
          {entries.map(([itemId, qty]) => {
            const item = itemsById.get(itemId);
            const name = item?.name ?? itemId;
            const rarity = item?.rarity ?? "common";
            return (
              <div
                key={itemId}
                className="flex items-center justify-between p-2 bg-[#0d1525] rounded border border-slate-700/50 hover:border-slate-600"
              >
                <span className={`text-xs ${RARITY_COLORS[rarity] ?? "text-slate-400"} truncate`}>
                  {name}
                </span>
                <span className="text-xs text-slate-300 font-mono ml-2">×{formatNumber(qty)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
