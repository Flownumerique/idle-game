"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { getDynamicSellPrice, getBasePrice } from "@/engine/market-engine";
import { formatNumber } from "@/lib/formatters";
import itemsData from "@/items.json";
import Button from "@/components/ui/Button";

interface ItemDef {
  id: string;
  name: string;
  rarity: string;
  sellPrice?: number;
  buyPrice?: number;
}

const sellableItems: ItemDef[] = (itemsData as { items: ItemDef[] }).items.filter(
  (i) => (i.sellPrice ?? 0) > 0
);

export default function MarketPanel() {
  const { inventory, gold, marketSales, removeItems, addGold, recordSale } = useGameStore((s) => ({
    inventory: s.inventory,
    gold: s.gold,
    marketSales: s.marketSales,
    removeItems: s.removeItems,
    addGold: s.addGold,
    recordSale: s.recordSale,
  }));

  const [tab, setTab] = useState<"sell" | "buy">("sell");

  function handleSell(itemId: string, qty: number) {
    if ((inventory[itemId] ?? 0) < qty) return;
    const price = getDynamicSellPrice(itemId, marketSales[itemId]);
    removeItems({ [itemId]: qty });
    addGold(price * qty);
    recordSale(itemId, qty);
  }

  return (
    <div className="game-card">
      <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
        <span>🏪</span> Marché
      </h3>

      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant={tab === "sell" ? "primary" : "ghost"}
          onClick={() => setTab("sell")}
        >
          Vendre
        </Button>
        <Button
          size="sm"
          variant={tab === "buy" ? "primary" : "ghost"}
          onClick={() => setTab("buy")}
        >
          Acheter
        </Button>
      </div>

      {tab === "sell" && (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {sellableItems
            .filter((item) => (inventory[item.id] ?? 0) > 0)
            .map((item) => {
              const qty = inventory[item.id] ?? 0;
              const price = getDynamicSellPrice(item.id, marketSales[item.id]);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-[#0d1525] rounded border border-slate-700/50"
                >
                  <div>
                    <div className="text-sm text-slate-200">{item.name}</div>
                    <div className="text-xs text-slate-400">
                      ×{formatNumber(qty)} · {formatNumber(price)} 🪙 chacun
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => handleSell(item.id, 1)}>
                      ×1
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleSell(item.id, qty)}>
                      Tout
                    </Button>
                  </div>
                </div>
              );
            })}
          {sellableItems.filter((item) => (inventory[item.id] ?? 0) > 0).length === 0 && (
            <p className="text-xs text-slate-500 italic">Aucun item à vendre</p>
          )}
        </div>
      )}

      {tab === "buy" && (
        <p className="text-xs text-slate-500 italic">
          Boutique d&apos;achat — disponible prochainement
        </p>
      )}
    </div>
  );
}
