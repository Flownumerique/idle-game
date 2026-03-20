"use client";

import { useGameStore } from "@/stores/game-store";
import { type FarmingSpot } from "@/types/game";
import { useEffect, useState } from "react";
import { getLevelForXp } from "@/lib/xp-calc";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";

// Herb gathering spots aligned with skills.json farming actions
const HERB_SPOTS = [
  { id: "plains_herb_1", name: "Herbe Guérisseuse (Plaines)", icon: "🌿", herbId: "herb_healing", respawnTime: 30_000, xp: 15, reqLevel: 1 },
  { id: "plains_herb_2", name: "Herbe Guérisseuse (Plaines)", icon: "🌿", herbId: "herb_healing", respawnTime: 30_000, xp: 15, reqLevel: 1 },
  { id: "forest_herb_1", name: "Herbe Aquatique (Forêt)", icon: "🌿", herbId: "herb_aquatic", respawnTime: 45_000, xp: 25, reqLevel: 10 },
];

function formatTime(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

export default function FarmingPanel() {
  const { farmingSpots, gatherHerb, inventory, skills, addItems, addSkillXp } = useGameStore((s) => ({
    farmingSpots: s.farmingSpots,
    gatherHerb: s.gatherHerb,
    inventory: s.inventory,
    skills: s.skills,
    addItems: s.addItems,
    addSkillXp: s.addSkillXp,
  }));

  const [now, setNow] = useState(Date.now());
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionProgress, setActionProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const farmingLevel = getLevelForXp(skills.farming?.xp ?? 0);

  const handleGather = (spotId: string) => {
    const spot = HERB_SPOTS.find(s => s.id === spotId);
    if (!spot) return;
    
    if (farmingLevel < spot.reqLevel) return;

    const farmingSpot = farmingSpots.find(s => s.id === spotId);
    if (!farmingSpot) return;

    // Check if spot is ready (not on cooldown)
    if (farmingSpot.respawnAt && now < farmingSpot.respawnAt) {
      return;
    }

    setActiveAction(spotId);
    setActionProgress(0);

    const actionTime = 3000; // 3 seconds base action time
    const startTime = Date.now();

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / actionTime) * 100);
      setActionProgress(progress);

      if (progress >= 100) {
        clearInterval(progressInterval);
        
        // Add rewards
        addItems({ [spot.herbId]: 2 });
        addSkillXp("farming", spot.xp);
        
        // Chance to get seeds
        if (Math.random() < 0.2) {
          const seedMap: Record<string, string> = {
            "herb_healing": "seed_healing",
          };
          const seedId = seedMap[spot.herbId];
          if (seedId) {
            addItems({ [seedId]: 1 });
          }
        }

        // Update spot respawn
        gatherHerb(spotId);
        
        setActiveAction(null);
        setActionProgress(0);
      }
    }, 100);
  };

  const availableSpots = HERB_SPOTS.filter((s) => farmingLevel >= s.reqLevel);

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="pixel-icon-lg flex-shrink-0">🌾</span>
            <div>
              <h2 className="font-cinzel" style={{ fontSize: "0.6rem", color: "var(--gold-light)", letterSpacing: "0.15em" }}>
                AGRICULTURE
              </h2>
              <p className="font-crimson text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Récoltez les herbes sauvages dans la nature.
              </p>
            </div>
          </div>
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{ width: 48, height: 48, border: "2px solid var(--gold)", background: "rgba(200,136,42,0.08)" }}
          >
            <div>
              <div className="font-cinzel text-center" style={{ fontSize: "1.2rem", color: "var(--text-primary)", lineHeight: 1 }}>
                {farmingLevel}
              </div>
              <div className="font-cinzel text-center" style={{ fontSize: "0.4rem", color: "var(--text-muted)" }}>LVL</div>
            </div>
          </div>
        </div>

        <div className="font-cinzel" style={{ fontSize: "0.45rem", color: "var(--text-muted)" }}>
          {availableSpots.length} SPOT{availableSpots.length !== 1 ? "S" : ""} DISPONIBLE{availableSpots.length !== 1 ? "S" : ""}
        </div>
      </div>

      {/* Herb spots */}
      <div className="section-title mb-2">Spots de Récolte</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {HERB_SPOTS.map((spot) => {
          const farmingSpot = farmingSpots.find(s => s.id === spot.id);
          const isLocked = farmingLevel < spot.reqLevel;
          const isOnCooldown = farmingSpot?.respawnAt && now < farmingSpot.respawnAt;
          const isReady = !isLocked && !isOnCooldown;
          const isActive = activeAction === spot.id;

          let remainingMs = 0;
          if (isOnCooldown && farmingSpot?.respawnAt) {
            remainingMs = farmingSpot.respawnAt - now;
          }

          const borderColor = isActive
            ? "var(--color-xp)"
            : isReady
            ? "var(--color-heal)"
            : isOnCooldown
            ? "var(--border-subtle)"
            : "var(--border-muted)";

          return (
            <div
              key={spot.id}
              style={{
                border: `2px solid ${borderColor}`,
                background: "var(--surface-card)",
                transition: "border-color 0.3s",
                opacity: isLocked ? 0.5 : 1,
              }}
            >
              {/* Spot header */}
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="pixel-icon-sm">
                    {isLocked ? "🔒" : isReady ? spot.icon : "⏳"}
                  </span>
                  <span className="font-cinzel" style={{ fontSize: "0.5rem", color: "var(--text-primary)" }}>
                    {spot.name}
                  </span>
                </div>
                <span
                  className="font-cinzel"
                  style={{
                    fontSize: "0.42rem",
                    color: isActive ? "var(--color-xp)" : isReady ? "var(--color-heal)" : isOnCooldown ? "var(--text-muted)" : "var(--text-muted)",
                  }}
                >
                  {isActive ? "EN COURS" : isReady ? "PRÊT" : isOnCooldown ? "RECHARGE" : isLocked ? "VERROUILLÉ" : ""}
                </span>
              </div>

              {/* Spot body */}
              <div className="p-3">
                {isActive && (
                  <div className="mb-3">
                    <ProgressBar value={actionProgress / 100} color="bg-cyan-500" height="h-1.5" />
                    <div className="font-crimson text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Récolte en cours...
                    </div>
                  </div>
                )}

                {isOnCooldown && (
                  <div className="mb-3 font-crimson text-xs" style={{ color: "var(--text-muted)" }}>
                    Disponible dans {formatTime(remainingMs)}
                  </div>
                )}

                {isReady && (
                  <div className="mb-3 font-crimson text-xs" style={{ color: "var(--color-heal)" }}>
                    +{spot.xp} XP · 2×{spot.icon} récoltes
                  </div>
                )}

                {isLocked && (
                  <div className="mb-3 font-crimson text-xs" style={{ color: "var(--text-muted)" }}>
                    Nécessite niveau {spot.reqLevel}
                  </div>
                )}

                <Button
                  size="sm"
                  variant={isActive ? "primary" : isReady ? "secondary" : "ghost"}
                  className="w-full"
                  disabled={!isReady || isActive}
                  onClick={() => handleGather(spot.id)}
                >
                  {isActive ? "Récolte..." : isReady ? "Récolter" : isOnCooldown ? "En recharge" : "Verrouillé"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Herb guide */}
      <div className="game-card">
        <div className="section-title mb-3">Guide des Herbes</div>
        <div className="space-y-2">
          {HERB_SPOTS.map((spot) => {
            const locked = farmingLevel < spot.reqLevel;
            return (
              <div
                key={spot.id}
                className="flex items-center justify-between"
                style={{ opacity: locked ? 0.45 : 1 }}
              >
                <div className="flex items-center gap-2">
                  <span className="pixel-icon-sm">{spot.icon}</span>
                  <span className="font-crimson text-xs" style={{ color: locked ? "var(--text-muted)" : "var(--text-primary)" }}>
                    {spot.name}
                  </span>
                  {locked && (
                    <span className="font-cinzel" style={{ fontSize: "0.4rem", color: "var(--gold-muted)" }}>
                      Niv. {spot.reqLevel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 font-crimson text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>{formatTime(spot.respawnTime)}</span>
                  <span style={{ color: "var(--color-xp)" }}>{spot.xp} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
