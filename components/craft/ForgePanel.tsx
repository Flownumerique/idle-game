"use client";

import { useGameStore } from "@/stores/game-store";
import { GameData } from "@/engine/data-loader";
import { getLevelForXp } from "@/lib/xp-calc";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { useState } from "react";

export default function ForgePanel() {
  const { skills, addItems, removeItems, addSkillXp, addLogEntry } = useGameStore((s) => ({
    skills: s.skills,
    addItems: s.addItems,
    removeItems: s.removeItems,
    addSkillXp: s.addSkillXp,
    addLogEntry: s.addLogEntry,
  }));

  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [craftQueue, setCraftQueue] = useState<Array<{ recipeId: string; finishTime: number }>>([]);

  // Get all smithing recipes
  const smithingRecipes = GameData.recipesForSkill("smithing");
  const smithingLevel = skills.smithing ? getLevelForXp(skills.smithing.xp) : 1;

  // Filter recipes that can be crafted
  const availableRecipes = smithingRecipes.filter(recipe => (recipe.reqLevel || 1) <= smithingLevel);

  const canCraft = (recipe: any) => {
    if (!recipe.inputs) return true;
    
    return recipe.inputs.every((input: any) => {
      const inventory = useGameStore.getState().inventory;
      return (inventory[input.itemId] || 0) >= input.qty;
    });
  };

  const craftItem = (recipe: any) => {
    if (!canCraft(recipe)) {
      // TODO: Show error message
      console.error("Ressources insuffisantes");
      return;
    }

    const state = useGameStore.getState();
    
    // Remove inputs from inventory
    const success = removeItems(
      recipe.inputs.reduce((acc: Record<string, number>, input: any) => {
        acc[input.itemId] = input.qty;
        return acc;
      }, {})
    );

    if (!success) {
      console.error("Impossible de retirer les ressources");
      return;
    }

    // Add output to inventory
    if (recipe.output) {
      addItems({ [recipe.output.itemId]: recipe.output.qty });
    }

    // Add skill XP
    addSkillXp("smithing", recipe.xpPerCraft);

    // Add log entry
    addLogEntry({
      type: "item_crafted",
      itemId: recipe.output?.itemId || "unknown",
      message: `🔨 ${recipe.name} crafté avec succès`,
      timestamp: Date.now()
    });

    console.log(`${recipe.name} crafté avec succès!`);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">Forge</h2>
            <p className="font-crimson text-sm" style={{ color: "var(--text-secondary)" }}>
              Niveau de forge: {smithingLevel}
            </p>
          </div>
          <div className="text-2xl">🔨</div>
        </div>
        
        {/* Smithing XP Progress */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-crimson text-sm" style={{ color: "var(--text-secondary)" }}>
              Smithing XP
            </span>
            <span className="font-cinzel text-sm" style={{ color: "var(--text-primary)" }}>
              {skills.smithing?.xp || 0} XP
            </span>
          </div>
          <ProgressBar 
            value={getLevelForXp(skills.smithing?.xp || 0) / 100} 
            height="h-2" 
            color="bg-orange-500" 
          />
        </div>
      </div>

      {/* Recipe Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weapons */}
        <div className="game-card">
          <h3 className="section-title mb-4">Armes</h3>
          <div className="space-y-3">
            {availableRecipes
              .filter(recipe => recipe.output && (recipe.output.itemId.includes('sword') || recipe.output.itemId.includes('axe') || recipe.output.itemId.includes('staff')))
              .map((recipe) => {
                const item = GameData.item(recipe.output!.itemId);
                const canCraftRecipe = canCraft(recipe);
                
                return (
                  <div 
                    key={recipe.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      canCraftRecipe 
                        ? 'hover:bg-gray-800' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{ 
                      borderColor: canCraftRecipe ? "var(--border-subtle)" : "var(--border-error)",
                      backgroundColor: "var(--surface-elevated)"
                    }}
                    onClick={() => canCraftRecipe && craftItem(recipe)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="font-cinzel text-sm" style={{ color: getRarityColor(item.rarity) }}>
                            {item.name}
                          </div>
                          <div className="font-crimson text-xs" style={{ color: "var(--text-muted)" }}>
                            Niv. {recipe.reqLevel}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-cinzel text-xs" style={{ color: "var(--gold-light)" }}>
                          +{recipe.xpPerCraft} XP
                        </div>
                        <div className="font-crimson text-xs" style={{ color: "var(--text-secondary)" }}>
                          {recipe.craftTime}s
                        </div>
                      </div>
                    </div>
                    
                    {/* Requirements */}
                    <div className="flex flex-wrap gap-1">
                      {recipe.inputs?.map((input: any) => {
                        const inputItem = GameData.item(input.itemId);
                        const inventory = useGameStore.getState().inventory;
                        const hasEnough = (inventory[input.itemId] || 0) >= input.qty;
                        
                        return (
                          <div 
                            key={input.itemId}
                            className={`px-2 py-1 rounded text-xs font-crimson ${
                              hasEnough ? 'bg-green-900' : 'bg-red-900'
                            }`}
                          >
                            {inputItem.icon} {input.qty}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Armor */}
        <div className="game-card">
          <h3 className="section-title mb-4">Armure</h3>
          <div className="space-y-3">
            {availableRecipes
              .filter(recipe => recipe.output && (recipe.output.itemId.includes('helm') || recipe.output.itemId.includes('chest') || recipe.output.itemId.includes('shield')))
              .map((recipe) => {
                const item = GameData.item(recipe.output!.itemId);
                const canCraftRecipe = canCraft(recipe);
                
                return (
                  <div 
                    key={recipe.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      canCraftRecipe 
                        ? 'hover:bg-gray-800' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    style={{ 
                      borderColor: canCraftRecipe ? "var(--border-subtle)" : "var(--border-error)",
                      backgroundColor: "var(--surface-elevated)"
                    }}
                    onClick={() => canCraftRecipe && craftItem(recipe)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="font-cinzel text-sm" style={{ color: getRarityColor(item.rarity) }}>
                            {item.name}
                          </div>
                          <div className="font-crimson text-xs" style={{ color: "var(--text-muted)" }}>
                            Niv. {recipe.reqLevel}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-cinzel text-xs" style={{ color: "var(--gold-light)" }}>
                          +{recipe.xpPerCraft} XP
                        </div>
                        <div className="font-crimson text-xs" style={{ color: "var(--text-secondary)" }}>
                          {recipe.craftTime}s
                        </div>
                      </div>
                    </div>
                    
                    {/* Requirements */}
                    <div className="flex flex-wrap gap-1">
                      {recipe.inputs?.map((input: any) => {
                        const inputItem = GameData.item(input.itemId);
                        const inventory = useGameStore.getState().inventory;
                        const hasEnough = (inventory[input.itemId] || 0) >= input.qty;
                        
                        return (
                          <div 
                            key={input.itemId}
                            className={`px-2 py-1 rounded text-xs font-crimson ${
                              hasEnough ? 'bg-green-900' : 'bg-red-900'
                            }`}
                          >
                            {inputItem.icon} {input.qty}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Debug Section */}
      <div className="game-card">
        <h3 className="section-title mb-4">Debug - Matériaux de test</h3>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={() => {
              addItems({
                "bar_copper": 20,
                "bar_iron": 10,
                "bar_steel": 5,
                "wood_common": 50,
                "charcoal": 20
              });
            }}
          >
            Ajouter matériaux
          </Button>
        </div>
      </div>
    </div>
  );
}
