"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { formatNumber } from "@/lib/formatters";
import itemsData from "@/items.json";

interface ItemDef {
  id: string; name: string; rarity: string; category: string; icon?: string;
}
const itemsById = new Map<string, ItemDef>();
for (const item of (itemsData as { items: ItemDef[] }).items) itemsById.set(item.id, item);

const RARITY_COLOR: Record<string, string> = {
  common:    "var(--rarity-common)",
  uncommon:  "var(--rarity-uncommon)",
  rare:      "var(--rarity-rare)",
  epic:      "var(--rarity-epic)",
  legendary: "var(--rarity-legendary)",
};
const RARITY_BORDER: Record<string, string> = {
  common:    "var(--border-default)",
  uncommon:  "rgba(114,184,96,0.35)",
  rare:      "rgba(96,168,212,0.35)",
  epic:      "rgba(152,112,200,0.35)",
  legendary: "rgba(240,200,80,0.45)",
};
const RARITY_LABEL: Record<string, string> = {
  common: "COMMUN", uncommon: "PEU COMMUN", rare: "RARE", epic: "ÉPIQUE", legendary: "LÉGENDAIRE",
};
const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
const CATEGORY_ORDER = ["equipment", "consumable", "material", "resource", "seed", "currency"];

type SortMode = "rarity" | "category";

export default function InventoryPanel({ filter = "all" }: { filter?: "all" | "resource" | "equipment" | "consumable" }) {
  const { inventory, gold } = useGameStore((s) => ({ inventory: s.inventory, gold: s.gold }));
  const [sortBy, setSortBy] = useState<SortMode>("rarity");

  const entries = Object.entries(inventory)
    .filter(([, qty]) => qty > 0)
    .filter(([itemId]) => {
      if (filter === "all") return true;
      const item = itemsById.get(itemId);
      if (!item) return false;
      
      if (filter === "resource") {
        return ["resource", "material", "seed", "currency"].includes(item.category);
      }
      
      return item.category === filter;
    })
    .sort(([aId], [bId]) => {
      const aItem = itemsById.get(aId);
      const bItem = itemsById.get(bId);

      if (sortBy === "category") {
        const aCat = CATEGORY_ORDER.indexOf(aItem?.category ?? "resource");
        const bCat = CATEGORY_ORDER.indexOf(bItem?.category ?? "resource");
        if (aCat !== bCat) return aCat - bCat;
      }

      // Default/Secondary sort by rarity
      const aR = RARITY_ORDER.indexOf(aItem?.rarity ?? "common");
      const bR = RARITY_ORDER.indexOf(bItem?.rarity ?? "common");
      if (aR !== bR) return aR - bR;

      // Tertiary sort by name
      return (aItem?.name ?? aId).localeCompare(bItem?.name ?? bId);
    });

  return (
    <div className="space-y-4">
      <div className="game-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="pixel-icon">🎒</span>
            <div>
              <h2 className="font-cinzel" style={{ fontSize: "0.55rem", color: "var(--gold-light)", letterSpacing: "0.15em" }}>INVENTAIRE</h2>
              <p className="font-cinzel mt-0.5" style={{ fontSize: "0.4rem", color: "var(--text-muted)" }}>
                {entries.length} OBJET{entries.length !== 1 ? "S" : ""}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.2)] p-1 rounded border border-[rgba(255,255,255,0.05)]">
              <button 
                onClick={() => setSortBy("rarity")}
                className={`px-2 py-1 font-cinzel text-[0.35rem] transition-all ${sortBy === "rarity" ? "bg-[var(--gold-light)] text-black" : "text-[var(--text-muted)] hover:text-white"}`}
              >
                RARETÉ
              </button>
              <button 
                onClick={() => setSortBy("category")}
                className={`px-2 py-1 font-cinzel text-[0.35rem] transition-all ${sortBy === "category" ? "bg-[var(--gold-light)] text-black" : "text-[var(--text-muted)] hover:text-white"}`}
              >
                CATÉGORIE
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="pixel-icon">🪙</span>
              <span className="font-cinzel" style={{ fontSize: "0.6rem", color: "var(--gold-light)" }}>{formatNumber(gold)}</span>
            </div>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="game-card text-center py-10">
          <p className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>INVENTAIRE VIDE</p>
          <p className="font-crimson mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Partez à l&apos;aventure !</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {entries.map(([itemId, qty]) => {
            const item   = itemsById.get(itemId);
            const name   = item?.name ?? itemId;
            const rarity = item?.rarity ?? "common";
            const icon   = item?.icon;
            return (
              <div
                key={itemId}
                className="flex items-center gap-2 p-2"
                style={{
                  background: "var(--surface-card)",
                  border: `2px solid ${RARITY_BORDER[rarity] ?? "var(--border-default)"}`,
                }}
                title={`${name} — ${RARITY_LABEL[rarity] ?? rarity}`}
              >
                <span
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 28, height: 28, border: `1px solid ${RARITY_BORDER[rarity] ?? "var(--border-default)"}`, background: "var(--surface-elevated)", fontSize: 14, imageRendering: "pixelated" }}
                >
                  {icon ?? "◻"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-crimson text-xs truncate" style={{ color: RARITY_COLOR[rarity] ?? "var(--text-secondary)" }}>{name}</div>
                  <div className="font-cinzel" style={{ fontSize: "0.38rem", color: "var(--text-muted)" }}>{RARITY_LABEL[rarity] ?? rarity}</div>
                </div>
                <span className="font-cinzel flex-shrink-0" style={{ fontSize: "0.5rem", color: "var(--text-secondary)" }}>×{formatNumber(qty)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
