// ──────────────────────────────────────────────
// Equipment Engine - Core equipment logic
// ──────────────────────────────────────────────

import type { GameState, SlotId, EquipmentItem, GameLogEntry } from "@/types/game";
import { GameData } from "./data-loader";

export function canEquipItem(state: GameState, itemId: string, slot: SlotId): {
  canEquip: boolean;
  reason?: string;
} {
  // Check if item exists
  let item;
  try {
    item = GameData.item(itemId);
  } catch {
    return { canEquip: false, reason: "Item non valide" };
  }
  
  if (item.category !== "equipment") {
    return { canEquip: false, reason: "Item non valide" };
  }

  // Check if slot is compatible
  if (item.slot !== slot) {
    return { canEquip: false, reason: "Slot incompatible" };
  }

  // Check if player has the item in inventory
  if (!state.inventory[itemId] || state.inventory[itemId] <= 0) {
    return { canEquip: false, reason: "Item non possédé" };
  }

  // Check requirements
  if (item.requirements) {
    // Level requirement
    if (item.requirements.level) {
      const totalLevel = Object.values(state.skills).reduce((sum, skill) => {
        const xp = skill?.xp || 0;
        const level = Math.floor(xp / 100) + 1; // Simplified level calc
        return sum + level;
      }, 0) / Object.keys(state.skills).length;
      
      if (totalLevel < item.requirements.level) {
        return { canEquip: false, reason: `Niveau ${item.requirements.level} requis` };
      }
    }

    // Skill requirement
    if (item.requirements.skill && item.requirements.skillLevel) {
      const skill = state.skills[item.requirements.skill as keyof typeof state.skills];
      const skillLevel = skill ? Math.floor(skill.xp / 100) + 1 : 1;
      
      if (skillLevel < item.requirements.skillLevel) {
        return { canEquip: false, reason: `${item.requirements.skill} niveau ${item.requirements.skillLevel} requis` };
      }
    }

    // Class requirement
    if (item.requirements.class && state.player.playerClass !== item.requirements.class) {
      return { canEquip: false, reason: `Classe ${item.requirements.class} requise` };
    }
  }

  return { canEquip: true };
}

export function equipItem(state: GameState, itemId: string, slot: SlotId): {
  success: boolean;
  message?: string;
  logEntry?: GameLogEntry;
} {
  const validation = canEquipItem(state, itemId, slot);
  if (!validation.canEquip) {
    let itemName = "Item inconnu";
    try {
      itemName = GameData.item(itemId).name;
    } catch {}
    
    return { 
      success: false, 
      message: validation.reason,
      logEntry: {
        type: "equipment_equipped",
        itemId,
        slot,
        message: `❌ Échec équipement ${itemName}: ${validation.reason}`,
        timestamp: Date.now()
      }
    };
  }

  const item = GameData.item(itemId) as EquipmentItem;
  const currentlyEquipped = state.equipment[slot];

  // Remove from inventory
  const newInventory = { ...state.inventory };
  newInventory[itemId] = (newInventory[itemId] || 0) - 1;
  if (newInventory[itemId] <= 0) {
    delete newInventory[itemId];
  }

  // Add previously equipped item back to inventory if any
  if (currentlyEquipped) {
    newInventory[currentlyEquipped] = (newInventory[currentlyEquipped] || 0) + 1;
  }

  // Update equipment
  const newEquipment = { ...state.equipment, [slot]: itemId };

  // Update state
  state.inventory = newInventory;
  state.equipment = newEquipment;

  const logEntry: GameLogEntry = {
    type: "equipment_equipped",
    itemId,
    slot,
    message: `✅ ${item.name} équipé dans ${getSlotDisplayName(slot)}`,
    timestamp: Date.now()
  };

  return { 
    success: true, 
    message: `${item.name} équipé avec succès`,
    logEntry
  };
}

export function unequipItem(state: GameState, slot: SlotId): {
  success: boolean;
  message?: string;
  logEntry?: GameLogEntry;
} {
  const currentlyEquipped = state.equipment[slot];
  if (!currentlyEquipped) {
    return { 
      success: false, 
      message: "Aucun équipement dans ce slot",
      logEntry: {
        type: "equipment_unequipped",
        slot,
        message: `❌ Aucun équipement dans ${getSlotDisplayName(slot)}`,
        timestamp: Date.now()
      }
    };
  }

  let item;
  try {
    item = GameData.item(currentlyEquipped) as EquipmentItem;
  } catch {
    return { 
      success: false, 
      message: "Item équipé invalide",
      logEntry: {
        type: "equipment_unequipped",
        itemId: currentlyEquipped,
        slot,
        message: `❌ Item équipé invalide dans ${getSlotDisplayName(slot)}`,
        timestamp: Date.now()
      }
    };
  }

  // Check inventory space
  const currentInventorySize = Object.values(state.inventory).reduce((sum, qty) => sum + qty, 0);
  if (currentInventorySize >= state.inventoryMax) {
    return { 
      success: false, 
      message: "Inventaire plein",
      logEntry: {
        type: "equipment_unequipped",
        itemId: currentlyEquipped,
        slot,
        message: `❌ Inventaire plein - impossible de déséquiper ${item.name}`,
        timestamp: Date.now()
      }
    };
  }

  // Add to inventory
  const newInventory = { ...state.inventory };
  newInventory[currentlyEquipped] = (newInventory[currentlyEquipped] || 0) + 1;

  // Remove from equipment
  const newEquipment = { ...state.equipment, [slot]: null };

  // Update state
  state.inventory = newInventory;
  state.equipment = newEquipment;

  const logEntry: GameLogEntry = {
    type: "equipment_unequipped",
    itemId: currentlyEquipped,
    slot,
    message: `📦 ${item.name} déséquipé de ${getSlotDisplayName(slot)}`,
    timestamp: Date.now()
  };

  return { 
    success: true, 
    message: `${item.name} déséquipé avec succès`,
    logEntry
  };
}

export function getSlotDisplayName(slot: SlotId): string {
  const slotNames: Record<SlotId, string> = {
    head: "Tête",
    chest: "Torse",
    legs: "Jambes",
    hands: "Mains",
    feet: "Pieds",
    mainhand: "Main principale",
    offhand: "Main secondaire",
    neck: "Cou",
    ring1: "Anneau 1",
    ring2: "Anneau 2",
    cape: "Cape",
    tool_woodcutting: "Outil Bûcheronnage",
    tool_mining: "Outil Minage",
    tool_fishing: "Outil Pêche"
  };
  return slotNames[slot] || slot;
}

export function getEquipmentSlots(): SlotId[] {
  return [
    "head",
    "chest", 
    "legs",
    "hands",
    "feet",
    "mainhand",
    "offhand",
    "neck",
    "ring1",
    "ring2",
    "cape",
    "tool_woodcutting",
    "tool_mining",
    "tool_fishing"
  ];
}
