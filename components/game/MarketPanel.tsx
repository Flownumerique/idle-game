"use client";

import { useState, useMemo } from "react";
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

export default function MarketPanel({ section = "sell" }: { section?: "buy" | "sell" }) {
  const { inventory, gold, marketSales, removeItems, addGold, recordSale } = useGameStore((s) => ({
    inventory: s.inventory,
    gold: s.gold,
    marketSales: s.marketSales,
    removeItems: s.removeItems,
    addGold: s.addGold,
    recordSale: s.recordSale,
  }));

  const sellableInventoryItems = useMemo(
    () => sellableItems.filter((item) => (inventory[item.id] ?? 0) > 0),
    [inventory]
  );

  function handleSell(itemId: string, qty: number) {
    if ((inventory[itemId] ?? 0) < qty) return;
    const price = getDynamicSellPrice(itemId, marketSales[itemId]);
    removeItems({ [itemId]: qty });
    addGold(price * qty);
    recordSale(itemId, qty);
  }

  return (
    <div className="game-card">
      <h3 className="section-title mb-4">
        <span>🏪</span> Marché — {section === "sell" ? "Vente" : "Achat"}
      </h3>

      {section === "sell" && (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {sellableInventoryItems.map((item) => {
            const qty = inventory[item.id] ?? 0;
            const price = getDynamicSellPrice(item.id, marketSales[item.id]);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-[#0d1525] rounded-sm border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div>
                  <div className="text-sm font-bold text-slate-100">{item.name}</div>
                  <div className="text-xs text-slate-400">
                    En stock: <span className="text-slate-200">{formatNumber(qty)}</span> · {formatNumber(price)} 🪙
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => handleSell(item.id, 1)}>
                    +1
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => handleSell(item.id, qty)}>
                    Tout
                  </Button>
                </div>
              </div>
            );
          })}
          {sellableInventoryItems.length === 0 && (
            <div className="py-8 text-center bg-[#0d1525]/30 rounded-sm border border-dashed border-slate-800">
              <p className="text-sm text-slate-500 italic">Votre inventaire est vide d'objets marchands</p>
            </div>
          )}
        </div>
      )}

      {section === "buy" && (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {(itemsData as { items: ItemDef[] }).items
            .filter(i => (i.buyPrice ?? 0) > 0 && i.id !== "gold")
            .map((item) => {
              const price = item.buyPrice!;
              const canAfford = gold >= price;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-[#0d1525] rounded-sm border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-100">{item.name}</div>
                    <div className="text-xs text-slate-400">
                      Prix: <span className={canAfford ? "text-amber-400" : "text-red-400"}>{formatNumber(price)} 🪙</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button 
                      size="sm" 
                      variant="primary" 
                      className="h-8 px-4" 
                      disabled={!canAfford}
                      onClick={() => {
                        const { spendGold, addItems } = useGameStore.getState();
                        if (spendGold(price)) {
                          addItems({ [item.id]: 1 });
                        }
                      }}
                    >
                      Acheter
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
