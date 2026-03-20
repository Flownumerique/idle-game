"use client";

import { useGameStore } from "@/stores/game-store";
import { GameData } from "@/engine/data-loader";
import { equipItem, unequipItem, getSlotDisplayName } from "@/engine/equipment-engine";
import type { SlotId } from "@/types/game";
import Button from "@/components/ui/Button";

interface CombatEquipmentProps {
  className?: string;
}

export default function CombatEquipment({ className }: CombatEquipmentProps) {
  const equipment = useGameStore((s) => s.equipment);
  const equipItemAction = useGameStore((s) => s.equipItem);
  const unequipItemAction = useGameStore((s) => s.unequipItem);
  const addLogEntry = useGameStore((s) => s.addLogEntry);

  const handleUnequip = (slot: SlotId) => {
    const state = useGameStore.getState();
    const result = unequipItem(state, slot);
    
    if (result.success) {
      unequipItemAction(slot);
      if (result.logEntry) {
        addLogEntry(result.logEntry);
      }
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: "var(--text-secondary)",
      uncommon: "var(--color-xp)",
      rare: "var(--color-magic)",
      epic: "var(--color-crit)",
      legendary: "var(--gold-light)"
    };
    return colors[rarity] || "var(--text-primary)";
  };

  const slotIcons: Record<SlotId, string> = {
    head: "👑",
    chest: "🦺",
    legs: "👖",
    hands: "🧤",
    feet: "👞",
    mainhand: "⚔️",
    offhand: "🛡️",
    neck: "📿",
    ring1: "💍",
    ring2: "💍",
    cape: "🦸",
    tool_woodcutting: "🪓",
    tool_mining: "⛏️",
    tool_fishing: "🎣"
  };

  // Only show combat-relevant slots (exclude tools)
  const combatSlots: SlotId[] = ["head", "chest", "legs", "hands", "feet", "mainhand", "offhand", "neck", "ring1", "ring2", "cape"];

  const equippedItems = combatSlots.map(slot => {
    const itemId = equipment[slot];
    if (!itemId) return { slot, item: null };
    
    try {
      const item = GameData.item(itemId);
      return { slot, item };
    } catch {
      return { slot, item: null };
    }
  }).filter(({ item }) => item !== null);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="pixel-icon-sm">⚔️</span>
        <h3 className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--gold-light)" }}>
          ÉQUIPEMENT DE COMBAT
        </h3>
      </div>

      {/* Quick Equipment Overview */}
      <div className="grid grid-cols-3 gap-2">
        {combatSlots.map((slot) => {
          const item = equipment[slot];
          let itemData = null;
          
          if (item) {
            try {
              itemData = GameData.item(item);
            } catch {}
          }

          return (
            <div
              key={slot}
              className="border rounded p-2 text-center cursor-pointer hover:bg-gray-800 transition-colors"
              style={{
                borderColor: itemData ? getRarityColor(itemData.rarity) : "var(--border-subtle)",
                backgroundColor: itemData ? "var(--surface-elevated)" : "var(--surface-primary)",
                minHeight: "60px"
              }}
              onClick={() => item && handleUnequip(slot)}
              title={itemData ? `${itemData.name} - ${getSlotDisplayName(slot)}` : getSlotDisplayName(slot)}
            >
              <div className="text-lg mb-1">
                {itemData ? itemData.icon : slotIcons[slot]}
              </div>
              <div className="text-xs font-cinzel" style={{ color: "var(--text-muted)" }}>
                {getSlotDisplayName(slot).slice(0, 8)}
              </div>
              {itemData && (
                <div className="text-xs font-crimson mt-1" style={{ color: getRarityColor(itemData.rarity) }}>
                  {itemData.name.slice(0, 10)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Equipment Stats Summary */}
      {equippedItems.length > 0 && (
        <div className="game-card">
          <div className="font-cinzel text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            STATS D'ÉQUIPEMENT
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {equippedItems.map(({ item }) => {
              if (!item || !item.stats) return null;
              
              return (
                <div key={item.id} className="space-y-1">
                  <div className="font-crimson" style={{ color: getRarityColor(item.rarity) }}>
                    {item.icon} {item.name}
                  </div>
                  {Object.entries(item.stats).map(([stat, value]) => {
                    if (!value || value === 0) return null;
                    
                    const statNames: Record<string, string> = {
                      attack: "Attaque",
                      defense: "Défense",
                      hp: "PV",
                      hpRegen: "Regen",
                      attackSpeed: "Vitesse",
                      precision: "Précision",
                      magicAttack: "Magie",
                      blockChance: "Blocage"
                    };
                    
                    return (
                      <div key={stat} className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                        <span>{statNames[stat] || stat}:</span>
                        <span style={{ color: "var(--text-primary)" }}>
                          {typeof value === 'number' && value < 1 ? `${(value * 100).toFixed(0)}%` : `+${value}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="secondary"
          onClick={() => {
            // Navigate to equipment tab
            const event = new CustomEvent('navigateToTab', { detail: 'equipment' });
            window.dispatchEvent(event);
          }}
        >
          Gérer l'équipement
        </Button>
      </div>
    </div>
  );
}
