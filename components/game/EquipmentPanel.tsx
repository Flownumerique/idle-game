"use client";

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
