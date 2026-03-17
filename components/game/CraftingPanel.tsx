"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/stores/game-store";
import Button from "@/components/ui/Button";

type RecipeInputs = Record<string, number>;
type RecipeOutputs = Record<string, number>;

interface MockRecipe {
  id: string;
  name: string;
  skill: "smithing" | "cooking" | "alchemy";
  reqLevel: number;
  inputs: RecipeInputs;
  outputs: RecipeOutputs;
  time: number;
}

// Simplified recipes for demonstration. Should come from recipes.json
const MOCK_RECIPES: MockRecipe[] = [
  { id: "smelt_copper", name: "Fondre du Cuivre", skill: "smithing", reqLevel: 1, inputs: { ore_copper: 2, coal: 1 }, outputs: { bar_copper: 1 }, time: 5000 },
  { id: "forge_sword_bronze", name: "Épée en Bronze", skill: "smithing", reqLevel: 5, inputs: { bar_copper: 2, wood_common: 1 }, outputs: { sword_bronze: 1 }, time: 10000 },
];

export default function CraftingPanel() {
  const { inventory, addItems, removeItems, addSkillXp, skills } = useGameStore((s) => ({
    inventory: s.inventory,
    addItems: s.addItems,
    removeItems: s.removeItems,
    addSkillXp: s.addSkillXp,
    skills: s.skills,
  }));

  const [activeTab, setActiveTab] = useState<"smithing" | "cooking" | "alchemy">("smithing");
  const [activeCraft, setActiveCraft] = useState<string | null>(null);
  const [craftProgress, setCraftProgress] = useState(0);

  // Filter recipes by selected skill tab
  const recipes = MOCK_RECIPES.filter((r) => r.skill === activeTab);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCraft) {
      const recipe = MOCK_RECIPES.find((r) => r.id === activeCraft);
      if (recipe) {
        let elapsed = 0;
        const tickRate = 100; // ms
        interval = setInterval(() => {
          elapsed += tickRate;
          if (elapsed >= recipe.time) {
            // Craft complete
            addItems(recipe.outputs);
            addSkillXp(recipe.skill, 50); // mock xp

            // Auto-continue logic using current state to avoid dependency loops resetting timer
            const currentInventory = useGameStore.getState().inventory;
            const currentRemoveItems = useGameStore.getState().removeItems;

            const hasMaterials = Object.entries(recipe.inputs).every(([item, qty]) => (currentInventory[item] || 0) >= qty);

            if (hasMaterials && currentRemoveItems(recipe.inputs)) {
               elapsed = 0;
               setCraftProgress(0);
            } else {
               setActiveCraft(null);
               setCraftProgress(0);
               clearInterval(interval);
            }
          } else {
            setCraftProgress(elapsed / recipe.time);
          }
        }, tickRate);
      }
    }
    return () => clearInterval(interval);
  }, [activeCraft, addItems, addSkillXp]);

  const handleCraft = (recipeId: string) => {
    if (activeCraft) {
        setActiveCraft(null);
        setCraftProgress(0);
        return;
    }

    const recipe = MOCK_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;

    if (skills[recipe.skill].level < recipe.reqLevel) {
      alert(`Niveau ${recipe.reqLevel} en ${recipe.skill} requis.`);
      return;
    }

    if (removeItems(recipe.inputs)) {
       setActiveCraft(recipe.id);
       setCraftProgress(0);
    } else {
      alert("Composants manquants.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-[#16213e] p-2 rounded-lg border border-[#0f3460]">
        {(["smithing", "cooking", "alchemy"] as const).map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2 rounded font-semibold transition-colors ${
              activeTab === tab ? "bg-blue-600 text-white" : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
            onClick={() => { setActiveTab(tab); setActiveCraft(null); setCraftProgress(0); }}
          >
            {tab === "smithing" ? "Forge" : tab === "cooking" ? "Cuisine" : "Alchimie"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="game-card flex flex-col justify-between">
            <h3 className="font-bold text-slate-200 mb-2">{recipe.name}</h3>
            <div className="text-sm text-slate-400 mb-4">
              <span className="font-medium text-amber-300 mr-2">Niv. {recipe.reqLevel}</span>
              <span>{(recipe.time / 1000).toFixed(1)}s</span>
            </div>

            <div className="bg-[#0d1525] p-3 rounded mb-4 flex-grow">
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Composants requis</h4>
              <ul className="space-y-1">
                {Object.entries(recipe.inputs).map(([item, qty]) => {
                  const has = inventory[item] || 0;
                  const missing = has < qty;
                  return (
                    <li key={item} className={`text-sm flex justify-between ${missing ? "text-red-400" : "text-green-400"}`}>
                      <span className="capitalize">{item.replace("_", " ")}</span>
                      <span>{has} / {qty}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

             {activeCraft === recipe.id && (
                <div className="w-full h-2 bg-slate-800 rounded-full mb-4 overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-100"
                        style={{ width: `${Math.min(100, Math.max(0, craftProgress * 100))}%` }}
                    />
                </div>
            )}

            <Button
                className="w-full"
                variant={activeCraft === recipe.id ? "danger" : "primary"}
                onClick={() => handleCraft(recipe.id)}
            >
                {activeCraft === recipe.id ? "Arrêter" : "Fabriquer"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
