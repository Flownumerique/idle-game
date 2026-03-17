"use client";

import { useGameStore } from "@/stores/game-store";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

// Simplified for simulation. Ideally, load from items.json and skills.json
const SEEDS = [
  { id: "seed_wheat", name: "Graines de Blé", resultId: "wheat", durationMs: 60000, xp: 20 },
  { id: "seed_healing", name: "Herbe Guérisseuse", resultId: "herb_healing", durationMs: 120000, xp: 45 },
  { id: "seed_golden", name: "Rose Dorée", resultId: "golden_rose", durationMs: 600000, xp: 150 },
];

export default function FarmingPanel() {
  const { farmPlots, plantSeed, harvestPlot, inventory, addItems, removeItems, addSkillXp } = useGameStore((s) => ({
    farmPlots: s.farmPlots,
    plantSeed: s.plantSeed,
    harvestPlot: s.harvestPlot,
    inventory: s.inventory,
    addItems: s.addItems,
    removeItems: s.removeItems,
    addSkillXp: s.addSkillXp,
  }));

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePlant = (plotIndex: number, seed: typeof SEEDS[0]) => {
    if (inventory[seed.id] && inventory[seed.id] > 0) {
      if (removeItems({ [seed.id]: 1 })) {
        plantSeed(plotIndex, seed.id, seed.durationMs);
      }
    }
  };

  const handleHarvest = (plotIndex: number, plot: typeof farmPlots[0]) => {
    if (!plot.seedId || !plot.readyAt || now < plot.readyAt) return;

    const seedInfo = SEEDS.find((s) => s.id === plot.seedId);
    if (!seedInfo) return;

    // Perfect harvest window: 5 minutes (300,000 ms) after readyAt
    const isPerfect = now >= plot.readyAt && now <= plot.readyAt + 300000;
    const yieldAmount = isPerfect ? 2 : 1;

    addItems({ [seedInfo.resultId]: yieldAmount });
    addSkillXp("farming", seedInfo.xp * yieldAmount);
    harvestPlot(plotIndex);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#16213e] p-4 rounded-lg border border-[#0f3460]">
        <div>
          <h2 className="text-xl font-bold text-slate-200">Parcelles Agricoles</h2>
          <p className="text-sm text-slate-400">Plantez des graines et récoltez-les une fois à maturité.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {farmPlots.map((plot, i) => {
          const isGrowing = plot.seedId && plot.readyAt && now < plot.readyAt;
          const isReady = plot.seedId && plot.readyAt && now >= plot.readyAt;
          const seedInfo = plot.seedId ? SEEDS.find((s) => s.id === plot.seedId) : null;

          let statusText = "Vide";
          let progress = 0;
          let isPerfect = false;

          if (isGrowing) {
            const totalTime = plot.readyAt! - plot.plantedAt!;
            const elapsed = now - plot.plantedAt!;
            progress = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
            const remaining = Math.ceil((plot.readyAt! - now) / 1000);
            statusText = `Pousse... (${remaining}s)`;
          } else if (isReady) {
            progress = 100;
            isPerfect = now <= plot.readyAt! + 300000;
            statusText = isPerfect ? "Récolte Parfaite!" : "Prêt à récolter";
          }

          return (
            <div key={i} className={`game-card relative overflow-hidden border-2 ${
              isPerfect ? "border-amber-400" : isReady ? "border-green-500" : isGrowing ? "border-blue-500" : "border-slate-700"
            }`}>
              <div className="flex flex-col items-center justify-center p-4 h-48">
                {/* Visual state */}
                <div className="text-4xl mb-4">
                  {!plot.seedId ? "🟫" : isReady ? "🌾" : "🌱"}
                </div>

                <h3 className="font-bold text-slate-200 text-center mb-1">
                  {plot.seedId ? seedInfo?.name : `Parcelle ${i + 1}`}
                </h3>

                <p className={`text-sm font-medium ${isPerfect ? "text-amber-400" : isReady ? "text-green-400" : "text-slate-400"}`}>
                  {statusText}
                </p>

                {isGrowing && (
                  <div className="w-full h-2 bg-slate-800 rounded-full mt-4 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 w-full">
                  {!plot.seedId ? (
                    <div className="flex flex-col gap-2">
                      <select
                        className="bg-[#0f3460] text-sm text-slate-200 p-1.5 rounded border border-slate-600 focus:outline-none"
                        onChange={(e) => {
                          const seed = SEEDS.find(s => s.id === e.target.value);
                          if (seed) handlePlant(i, seed);
                          e.target.value = ""; // reset
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Planter une graine...</option>
                        {SEEDS.map(seed => {
                          const qty = inventory[seed.id] || 0;
                          return (
                            <option key={seed.id} value={seed.id} disabled={qty === 0}>
                              {seed.name} ({qty})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : isReady ? (
                    <Button
                      className="w-full"
                      variant={isPerfect ? "primary" : "secondary"}
                      onClick={() => handleHarvest(i, plot)}
                    >
                      Récolter
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
