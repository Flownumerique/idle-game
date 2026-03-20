"use client";

import { useGameStore } from "@/stores/game-store";
import { type PlantPlot } from "@/types/game";
import { useEffect, useState } from "react";
import { getLevelForXp } from "@/lib/xp-calc";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";

// Seed definitions aligned with skills.json farming actions
const SEEDS = [
  { id: "seed_wheat",   name: "Blé",              icon: "🌾", resultId: "wheat",        durationMs: 90_000,  xp: 12, reqLevel: 1  },
  { id: "seed_healing", name: "Herbe Guérisseuse", icon: "🌿", resultId: "herb_healing", durationMs: 120_000, xp: 20, reqLevel: 1  },
  { id: "seed_golden",  name: "Rose Dorée",        icon: "🌹", resultId: "flower_golden", durationMs: 300_000, xp: 65, reqLevel: 20 },
  { id: "seed_night",   name: "Herbe Nocturne",    icon: "🌑", resultId: "herb_night",   durationMs: 600_000, xp: 180, reqLevel: 40 },
  { id: "seed_dawn",    name: "Fleur de Lumière",  icon: "✨", resultId: "flower_dawn",  durationMs: 480_000, xp: 120, reqLevel: 40 },
];

const PERFECT_WINDOW_MS = 300_000;

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

export default function PlantingPanel() {
  const { plantPlots, plantSeed, harvestPlot, inventory, skills, addItems, removeItems, addSkillXp } = useGameStore((s) => ({
    plantPlots: s.plantPlots,
    plantSeed: s.plantSeed,
    harvestPlot: s.harvestPlot,
    inventory: s.inventory,
    skills: s.skills,
    addItems: s.addItems,
    removeItems: s.removeItems,
    addSkillXp: s.addSkillXp,
  }));

  const [now, setNow] = useState(Date.now());
  const [selectedSeed, setSelectedSeed] = useState<Record<number, string>>({});

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const plantingLevel = getLevelForXp(skills.planting?.xp ?? 0);

  const handlePlant = (plotIndex: number) => {
    const seedId = selectedSeed[plotIndex];
    if (!seedId) return;
    const seed = SEEDS.find((s) => s.id === seedId);
    if (!seed) return;
    if ((inventory[seed.id] ?? 0) < 1) return;
    if (removeItems({ [seed.id]: 1 })) {
      plantSeed(plotIndex, seed.id, seed.durationMs);
      setSelectedSeed((prev) => ({ ...prev, [plotIndex]: "" }));
    }
  };

  const handleHarvest = (plotIndex: number) => {
    const plot = plantPlots[plotIndex];
    if (!plot.seedId || !plot.readyAt || now < plot.readyAt) return;

    const seed = SEEDS.find((s) => s.id === plot.seedId);
    if (!seed) return;

    const isPerfect = now <= plot.readyAt + PERFECT_WINDOW_MS;
    const yieldAmount = isPerfect ? 2 : 1;

    addItems({ [seed.resultId]: yieldAmount });
    addSkillXp("planting", seed.xp * yieldAmount);
    harvestPlot(plotIndex);
  };

  const availableSeeds = SEEDS.filter((s) => plantingLevel >= s.reqLevel);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="pixel-icon-lg flex-shrink-0">🌾</span>
            <div>
              <h2 className="font-cinzel" style={{ fontSize: "0.6rem", color: "var(--gold-light)", letterSpacing: "0.15em" }}>
                PLANTATION
              </h2>
              <p className="font-crimson text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Plantez et cultivez des graines dans vos parcelles.
              </p>
            </div>
          </div>
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{ width: 48, height: 48, border: "2px solid var(--gold)", background: "rgba(200,136,42,0.08)" }}
          >
            <div>
              <div className="font-cinzel text-center" style={{ fontSize: "1.2rem", color: "var(--text-primary)", lineHeight: 1 }}>
                {plantingLevel}
              </div>
              <div className="font-cinzel text-center" style={{ fontSize: "0.4rem", color: "var(--text-muted)" }}>LVL</div>
            </div>
          </div>
        </div>

        <div className="font-cinzel" style={{ fontSize: "0.45rem", color: "var(--text-muted)" }}>
          {plantPlots.length} PARCELLE{plantPlots.length !== 1 ? "S" : ""} DISPONIBLE{plantPlots.length !== 1 ? "S" : ""}
        </div>
      </div>

      {/* Seed inventory */}
      {availableSeeds.some((s) => (inventory[s.id] ?? 0) > 0) && (
        <div className="game-card">
          <div className="section-title mb-3">Graines en Stock</div>
          <div className="flex flex-wrap gap-2">
            {availableSeeds.filter((s) => (inventory[s.id] ?? 0) > 0).map((seed) => (
              <div
                key={seed.id}
                className="flex items-center gap-1.5 px-2 py-1"
                style={{ border: "1px solid var(--border-default)", background: "var(--surface-elevated)" }}
              >
                <span className="pixel-icon-sm">{seed.icon}</span>
                <span className="font-crimson text-xs" style={{ color: "var(--text-primary)" }}>{seed.name}</span>
                <span className="font-cinzel" style={{ fontSize: "0.45rem", color: "var(--gold)" }}>×{inventory[seed.id]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plots */}
      <div className="section-title mb-2">Parcelles</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(plantPlots as PlantPlot[]).map((plot: PlantPlot, i: number) => {
          const isGrowing = !!(plot.seedId && plot.readyAt && now < plot.readyAt);
          const isReady   = !!(plot.seedId && plot.readyAt && now >= plot.readyAt);
          const seed      = plot.seedId ? SEEDS.find((s) => s.id === plot.seedId) : null;
          const isPerfect = isReady && now <= plot.readyAt! + PERFECT_WINDOW_MS;

          let progress = 0;
          let remainingMs = 0;
          if (isGrowing && plot.plantedAt && plot.readyAt) {
            const total   = plot.readyAt - plot.plantedAt;
            const elapsed = now - plot.plantedAt;
            progress    = Math.min(100, Math.max(0, (elapsed / total) * 100)) / 100;
            remainingMs = plot.readyAt - now;
          }

          const borderColor = isPerfect
            ? "var(--gold)"
            : isReady
            ? "var(--color-heal)"
            : isGrowing
            ? "var(--color-xp)"
            : "var(--border-subtle)";

          return (
            <div
              key={i}
              style={{
                border: `2px solid ${borderColor}`,
                background: "var(--surface-card)",
                transition: "border-color 0.3s",
              }}
            >
              {/* Plot header */}
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="pixel-icon-sm">
                    {!plot.seedId ? "🟫" : isReady ? (seed?.icon ?? "🌾") : "🌱"}
                  </span>
                  <span className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--text-primary)" }}>
                    {seed?.name ?? `Parcelle ${i + 1}`}
                  </span>
                </div>
                <span
                  className="font-cinzel"
                  style={{
                    fontSize: "0.42rem",
                    color: isPerfect ? "var(--gold)" : isReady ? "var(--color-heal)" : isGrowing ? "var(--color-xp)" : "var(--text-muted)",
                  }}
                >
                  {isPerfect ? "✦ PARFAIT" : isReady ? "PRÊT" : isGrowing ? "EN CROISSANCE" : "VIDE"}
                </span>
              </div>

              {/* Plot body */}
              <div className="p-3">
                {isGrowing && (
                  <div className="mb-3">
                    <ProgressBar value={progress} color="bg-cyan-500" height="h-1.5" />
                    <div className="font-crimson text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Prêt dans {formatTime(remainingMs)}
                    </div>
                  </div>
                )}

                {isReady && (
                  <div className="mb-3 font-crimson text-xs" style={{ color: isPerfect ? "var(--gold-light)" : "var(--color-heal)" }}>
                    {isPerfect
                      ? `✦ Récolte parfaite ! +${seed!.xp * 2} XP · ×2 récolte`
                      : `+${seed!.xp} XP à la récolte`}
                  </div>
                )}

                {!plot.seedId && (
                  <div className="space-y-2">
                    <select
                      className="medieval-input text-xs w-full"
                      value={selectedSeed[i] ?? ""}
                      onChange={(e) => setSelectedSeed((prev) => ({ ...prev, [i]: e.target.value }))}
                    >
                      <option value="" disabled>Choisir une graine...</option>
                      {availableSeeds.map((s) => {
                        const qty = inventory[s.id] ?? 0;
                        return (
                          <option key={s.id} value={s.id} disabled={qty === 0}>
                            {s.icon} {s.name} ({qty}) — {formatTime(s.durationMs)} · {s.xp} XP
                          </option>
                        );
                      })}
                      {SEEDS.filter((s) => plantingLevel < s.reqLevel).map((s) => (
                        <option key={s.id} value="" disabled>
                          🔒 {s.name} (Niveau {s.reqLevel})
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      disabled={!selectedSeed[i] || (inventory[selectedSeed[i]] ?? 0) < 1}
                      onClick={() => handlePlant(i)}
                    >
                      Planter
                    </Button>
                  </div>
                )}

                {isReady && (
                  <Button
                    size="sm"
                    variant={isPerfect ? "primary" : "secondary"}
                    className="w-full"
                    onClick={() => handleHarvest(i)}
                  >
                    {isPerfect ? "✦ Récolter (Parfait)" : "Récolter"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seed guide */}
      <div className="game-card">
        <div className="section-title mb-3">Catalogue des Graines</div>
        <div className="space-y-2">
          {SEEDS.map((seed) => {
            const locked = plantingLevel < seed.reqLevel;
            return (
              <div
                key={seed.id}
                className="flex items-center justify-between"
                style={{ opacity: locked ? 0.45 : 1 }}
              >
                <div className="flex items-center gap-2">
                  <span className="pixel-icon-sm">{seed.icon}</span>
                  <span className="font-crimson text-xs" style={{ color: locked ? "var(--text-muted)" : "var(--text-primary)" }}>
                    {seed.name}
                  </span>
                  {locked && (
                    <span className="font-cinzel" style={{ fontSize: "0.4rem", color: "var(--gold-muted)" }}>
                      Niv. {seed.reqLevel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 font-crimson text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>{formatTime(seed.durationMs)}</span>
                  <span style={{ color: "var(--color-xp)" }}>{seed.xp} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
