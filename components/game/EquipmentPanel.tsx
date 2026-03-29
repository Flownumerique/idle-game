"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import { GameData } from "@/engine/data-loader";
import { equipItem, unequipItem, getSlotDisplayName, getEquipmentSlots } from "@/engine/equipment-engine";
import type { SlotId } from "@/types/game";
import Button from "@/components/ui/Button";
import { getRarityColor } from "@/lib/rarity";
import { SLOT_ICONS } from "@/lib/equipment-meta";

interface EquipmentSlotProps {
  slot: SlotId;
  equippedItemId: string | null;
  onEquip: (itemId: string, slot: SlotId) => void;
  onUnequip: (slot: SlotId) => void;
  position?: string;
}

function EquipmentSlot({ slot, equippedItemId, onEquip, onUnequip, position = "" }: EquipmentSlotProps) {
  const inventory = useGameStore((s) => s.inventory);
  
  let item = null;
  if (equippedItemId) {
    try {
      item = GameData.item(equippedItemId);
    } catch {}
  }

  return (
    <div 
      className="border rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800 transition-all hover:scale-105"
      style={{ 
        borderColor: item ? getRarityColor(item.rarity) : "var(--border-subtle)",
        backgroundColor: item ? "var(--surface-elevated)" : "var(--surface-primary)",
        width: "70px",
        height: "70px",
        position: "relative"
      }}
      onClick={() => {
        if (equippedItemId) {
          onUnequip(slot);
        } else {
          // TODO: Open inventory selection modal
          console.log(`Open inventory for slot ${slot}`);
        }
      }}
    >
      <div className="text-xl mb-1">
        {item ? item.icon : SLOT_ICONS[slot]}
      </div>
      <div className="text-xs font-cinzel text-center" style={{ color: "var(--text-muted)" }}>
        {getSlotDisplayName(slot)}
      </div>
      {item && (
        <div 
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: getRarityColor(item.rarity) }}
        />
      )}
    </div>
  );
}

function InventoryEquipmentItem({ itemId, onEquip }: { itemId: string; onEquip: (itemId: string, slot: SlotId) => void }) {
  const item = GameData.item(itemId);
  const equipment = useGameStore((s) => s.equipment);

  const getCompatibleSlot = (item: any): SlotId | null => {
    if (item.slot) return item.slot;
    if (item.category === "equipment") {
      // Determine slot based on item type
      if (item.id.includes("sword") || item.id.includes("axe") || item.id.includes("staff")) return "mainhand";
      if (item.id.includes("shield")) return "offhand";
      if (item.id.includes("helm")) return "head";
      if (item.id.includes("chest")) return "chest";
      if (item.id.includes("ring")) return "ring1";
      if (item.id.includes("amulet") || item.id.includes("neck")) return "neck";
      if (item.id.includes("tool_")) return item.slot as SlotId;
    }
    return null;
  };

  const compatibleSlot = getCompatibleSlot(item);
  const isEquipped = Object.values(equipment).includes(itemId);

  return (
    <div 
      className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-all hover:scale-102 ${
        isEquipped ? "opacity-50" : "hover:bg-gray-800"
      }`}
      style={{ 
        borderColor: getRarityColor(item.rarity),
        backgroundColor: "var(--surface-elevated)"
      }}
      onClick={() => {
        if (!isEquipped && compatibleSlot) {
          onEquip(itemId, compatibleSlot);
        }
      }}
    >
      <div className="text-2xl">{item.icon}</div>
      <div className="flex-1">
        <div className="font-medium text-sm" style={{ color: getRarityColor(item.rarity) }}>
          {item.name}
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {getSlotDisplayName(compatibleSlot || "mainhand")}
          {isEquipped && " (Équipé)"}
        </div>
        {item.stats && (
          <div className="text-xs mt-1 space-x-2">
            {Object.entries(item.stats).map(([stat, value]) => (
              <span key={stat} style={{ color: "var(--color-xp)" }}>
                {stat}: +{value as number}
              </span>
            ))}
          </div>
        )}
      </div>
      {isEquipped && (
        <div className="text-xs text-green-400">✓</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Consumable hotbar slot
// ──────────────────────────────────────────────

function ConsumableSlot({ index }: { index: 0 | 1 }) {
  const [showSelector, setShowSelector] = useState(false);
  const consumableSlots  = useGameStore((s) => s.consumableSlots);
  const inventory        = useGameStore((s) => s.inventory);
  const setConsumableSlot = useGameStore((s) => s.setConsumableSlot);
  const consumeItem       = useGameStore((s) => s.consumeItem);

  const assignedId = consumableSlots[index];

  let assignedItem: any = null;
  if (assignedId) {
    try { assignedItem = GameData.item(assignedId); } catch {}
  }

  const qty = assignedId ? (inventory[assignedId] ?? 0) : 0;

  // All consumables in inventory (qty > 0)
  const consumablesInInventory = Object.entries(inventory)
    .filter(([id, q]) => {
      if ((q as number) <= 0) return false;
      try { return GameData.item(id).category === "consumable"; } catch { return false; }
    })
    .map(([id]) => { try { return { id, item: GameData.item(id) }; } catch { return null; } })
    .filter(Boolean) as { id: string; item: any }[];

  return (
    <div className="relative">
      <div
        className="rounded-sm p-2.5 flex flex-col gap-2"
        style={{
          background: "var(--surface-elevated)",
          border: `1px solid ${assignedItem ? getRarityColor(assignedItem.rarity) : "var(--border-subtle)"}`,
          minWidth: 120,
        }}
      >
        {/* Slot header */}
        <div className="flex items-center justify-between gap-1">
          <span className="font-cinzel" style={{ fontSize: "0.42rem", color: "var(--text-muted)" }}>
            SLOT {index + 1}
          </span>
          {assignedId && (
            <button
              onClick={() => setConsumableSlot(index, null)}
              style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1 }}
              title="Retirer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Item display */}
        {assignedItem ? (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>{assignedItem.icon ?? "🧪"}</span>
            <div className="flex-1 min-w-0">
              <div className="font-crimson text-xs truncate" style={{ color: getRarityColor(assignedItem.rarity) }}>
                {assignedItem.name}
              </div>
              <div className="font-mono" style={{ fontSize: "0.55rem", color: qty > 0 ? "var(--text-secondary)" : "var(--color-damage)" }}>
                ×{qty} en inventaire
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 py-1">
            <span style={{ fontSize: "1.4rem", opacity: 0.3 }}>🧪</span>
            <span className="font-cinzel" style={{ fontSize: "0.4rem", color: "var(--text-muted)" }}>Vide</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1">
          {assignedItem && (
            <button
              disabled={qty <= 0}
              onClick={() => consumeItem(assignedId!)}
              className="flex-1 font-cinzel rounded-sm px-1 py-0.5"
              style={{
                fontSize: "0.42rem",
                background: qty > 0 ? "rgba(61,214,140,0.12)" : "rgba(255,255,255,0.04)",
                border: qty > 0 ? "1px solid rgba(61,214,140,0.35)" : "1px solid var(--border-subtle)",
                color: qty > 0 ? "var(--color-heal)" : "var(--text-muted)",
                cursor: qty > 0 ? "pointer" : "not-allowed",
              }}
            >
              Utiliser
            </button>
          )}
          <button
            onClick={() => setShowSelector((v) => !v)}
            className="flex-1 font-cinzel rounded-sm px-1 py-0.5"
            style={{
              fontSize: "0.42rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            {assignedItem ? "Changer" : "Assigner"}
          </button>
        </div>
      </div>

      {/* Consumable selector dropdown */}
      {showSelector && (
        <div
          className="absolute top-full left-0 mt-1 rounded-sm overflow-hidden z-50"
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border-accent)",
            minWidth: 180,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {consumablesInInventory.length === 0 ? (
            <div className="px-3 py-4 text-center font-cinzel" style={{ fontSize: "0.42rem", color: "var(--text-muted)" }}>
              Aucun consommable dans l&apos;inventaire
            </div>
          ) : (
            consumablesInInventory.map(({ id, item }) => (
              <button
                key={id}
                className="w-full text-left flex items-center gap-2 px-2.5 py-2 hover:bg-white/5 transition-colors"
                onClick={() => {
                  setConsumableSlot(index, id);
                  setShowSelector(false);
                }}
              >
                <span style={{ fontSize: "1rem" }}>{item.icon ?? "🧪"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-crimson text-xs truncate" style={{ color: getRarityColor(item.rarity) }}>
                    {item.name}
                  </div>
                  <div className="font-mono" style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>
                    ×{inventory[id] ?? 0}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function EquipmentPanel() {
  const equipment = useGameStore((s) => s.equipment);
  const inventory = useGameStore((s) => s.inventory);
  const equipItemAction = useGameStore((s) => s.equipItem);
  const unequipItemAction = useGameStore((s) => s.unequipItem);
  const addItems = useGameStore((s) => s.addItems);
  const addLogEntry = useGameStore((s) => s.addLogEntry);

  const handleEquip = (itemId: string, slot: SlotId) => {
    const state = useGameStore.getState();
    const result = equipItem(state, itemId, slot);
    
    if (result.success) {
      equipItemAction(itemId, slot);
      if (result.logEntry) {
        addLogEntry(result.logEntry);
      }
      console.log(result.message);
    } else {
      if (result.logEntry) {
        addLogEntry(result.logEntry);
      }
      console.error(result.message);
    }
  };

  const handleUnequip = (slot: SlotId) => {
    const state = useGameStore.getState();
    const result = unequipItem(state, slot);
    
    if (result.success) {
      unequipItemAction(slot);
      if (result.logEntry) {
        addLogEntry(result.logEntry);
      }
      console.log(result.message);
    } else {
      if (result.logEntry) {
        addLogEntry(result.logEntry);
      }
      console.error(result.message);
    }
  };

  // Get equipment items from inventory
  const equipmentItems = Object.entries(inventory)
    .filter(([itemId, qty]) => {
      try {
        const item = GameData.item(itemId);
        return item.category === "equipment" && qty > 0;
      } catch {
        return false;
      }
    })
    .map(([itemId]) => itemId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#16213e] p-4 rounded-lg border border-[#0f3460]">
        <div>
          <h2 className="text-xl font-bold text-slate-200">Équipement</h2>
          <p className="text-sm text-slate-400">Gérez votre équipement et votre apparence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Character Equipment Layout */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">Personnage</h3>
          
          <div className="relative bg-[#0d1525] border border-[#0f3460] rounded-lg p-8" style={{ minHeight: "400px" }}>
            
            {/* Head */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <EquipmentSlot
                slot="head"
                equippedItemId={equipment.head}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Cape */}
            <div className="absolute top-4 right-4">
              <EquipmentSlot
                slot="cape"
                equippedItemId={equipment.cape}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Neck */}
            <div className="absolute top-20 left-4">
              <EquipmentSlot
                slot="neck"
                equippedItemId={equipment.neck}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Main Hand */}
            <div className="absolute top-32 left-4">
              <EquipmentSlot
                slot="mainhand"
                equippedItemId={equipment.mainhand}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Chest */}
            <div className="absolute top-24 left-1/2 transform -translate-x-1/2">
              <EquipmentSlot
                slot="chest"
                equippedItemId={equipment.chest}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Off Hand */}
            <div className="absolute top-32 right-4">
              <EquipmentSlot
                slot="offhand"
                equippedItemId={equipment.offhand}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Ring 1 */}
            <div className="absolute top-44 left-8">
              <EquipmentSlot
                slot="ring1"
                equippedItemId={equipment.ring1}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Ring 2 */}
            <div className="absolute top-44 right-8">
              <EquipmentSlot
                slot="ring2"
                equippedItemId={equipment.ring2}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Legs */}
            <div className="absolute top-44 left-1/2 transform -translate-x-1/2">
              <EquipmentSlot
                slot="legs"
                equippedItemId={equipment.legs}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Hands */}
            <div className="absolute top-64 left-1/2 transform -translate-x-1/2 -translate-x-12">
              <EquipmentSlot
                slot="hands"
                equippedItemId={equipment.hands}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Feet */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <EquipmentSlot
                slot="feet"
                equippedItemId={equipment.feet}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>

            {/* Character silhouette */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-6xl opacity-20">👤</div>
            </div>
          </div>

          {/* Tools Section */}
          <div className="bg-[#0d1525] border border-[#0f3460] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Outils</h4>
            <div className="flex gap-3">
              <EquipmentSlot
                slot="tool_woodcutting"
                equippedItemId={equipment.tool_woodcutting}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
              <EquipmentSlot
                slot="tool_mining"
                equippedItemId={equipment.tool_mining}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
              <EquipmentSlot
                slot="tool_fishing"
                equippedItemId={equipment.tool_fishing}
                onEquip={handleEquip}
                onUnequip={handleUnequip}
              />
            </div>
          </div>

          {/* Consumable Slots */}
          <div className="bg-[#0d1525] border border-[#0f3460] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-1">Consommables</h4>
            <p className="font-crimson text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Assignez des potions ou des plats pour les utiliser rapidement.
            </p>
            <div className="flex gap-3">
              <ConsumableSlot index={0} />
              <ConsumableSlot index={1} />
            </div>
          </div>
        </div>

        {/* Inventory Equipment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-200">Équipement dans l'inventaire</h3>
          
          <div className="bg-[#0d1525] border border-[#0f3460] rounded-lg p-4 max-h-96 overflow-y-auto">
            {equipmentItems.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <div className="text-4xl mb-2">🎒</div>
                <p>Aucun équipement dans l'inventaire</p>
                <p className="text-sm mt-2">Craftez ou trouvez des équipements pour les voir ici</p>
              </div>
            ) : (
              <div className="space-y-2">
                {equipmentItems.map((itemId) => (
                  <InventoryEquipmentItem
                    key={itemId}
                    itemId={itemId}
                    onEquip={handleEquip}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Debug Section */}
          <div className="bg-[#0d1525] border border-[#0f3460] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Test - Ajouter équipement</h4>
            <div className="space-y-2">
              <Button 
                size="sm" 
                onClick={() => {
                  addItems({
                    "sword_copper": 1,
                    "helm_copper": 1,
                    "chest_copper": 1,
                    "shield_wood": 1,
                    "ring_silver": 1,
                    "amulet_miner": 1
                  });
                }}
              >
                Ajouter équipement de base
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => {
                  addItems({
                    "sword_steel": 1,
                    "chest_steel": 1,
                    "ring_gold": 1
                  });
                }}
              >
                Ajouter équipement supérieur
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
