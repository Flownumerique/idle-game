"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import type { PlayerClass } from "@/types/game";
import Button from "@/components/ui/Button";

const CLASSES: {
  id: PlayerClass;
  icon: string;
  name: string;
  bonus: string;
  startItem: string;
  lore: string;
}[] = [
  { id: "warrior",  icon: "⚔️", name: "Guerrier",  bonus: "+10% dégâts",    startItem: "Épée en Fer",   lore: "Forgé par les batailles, maître du fer et du sang." },
  { id: "forester", icon: "🌿", name: "Forestier", bonus: "+10% ressources", startItem: "Hache",         lore: "Gardien des forêts, ami des terres sauvages." },
  { id: "mage",     icon: "🔮", name: "Mage",      bonus: "+10% magie",      startItem: "Bâton en Bois", lore: "Érudit des arcanes, tisseur de sorts anciens." },
];

export default function CharacterCreation() {
  const createCharacter = useGameStore((s) => s.createCharacter);
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<PlayerClass>("warrior");
  const [error, setError] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 3)  { setError("Minimum 3 caractères requis."); return; }
    if (trimmed.length > 20) { setError("Maximum 20 caractères."); return; }
    createCharacter(trimmed, selectedClass);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "var(--void)",
        backgroundImage: `
          radial-gradient(ellipse 70% 60% at 30% 30%, rgba(200,136,42,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 75% 70%, rgba(120,60,20,0.12) 0%, transparent 60%)
        `,
      }}
    >
      <div className="w-full max-w-lg">

        {/* Titre */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center mb-5 torch-glow"
            style={{
              width: 72, height: 72,
              border: "3px solid var(--gold)",
              background: "rgba(200,136,42,0.1)",
              fontSize: 36,
            }}
          >
            ⚔️
          </div>
          <h1
            className="font-cinzel block mb-3"
            style={{ color: "var(--gold-light)", fontSize: "0.85rem", letterSpacing: "0.4em" }}
          >
            IDLE REALMS
          </h1>
          <div className="divider-fantasy mx-auto w-40 my-3" />
          <p className="font-crimson text-sm" style={{ color: "var(--text-secondary)" }}>
            Forgez votre légende dans les Royaumes
          </p>
        </div>

        {/* Nom */}
        <div className="game-card mb-4">
          <label className="block font-cinzel mb-2" style={{ fontSize: "0.5rem", color: "var(--gold)", letterSpacing: "0.15em" }}>
            ▸ NOM DU PERSONNAGE
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Entrez un nom (3–20 caractères)"
            className="medieval-input"
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {error && (
            <p className="font-cinzel mt-2" style={{ fontSize: "0.45rem", color: "var(--color-damage)" }}>
              ✗ {error}
            </p>
          )}
        </div>

        {/* Classe */}
        <div className="mb-6">
          <p className="font-cinzel mb-3" style={{ fontSize: "0.5rem", color: "var(--gold)", letterSpacing: "0.15em" }}>
            ▸ CHOISIR UNE CLASSE
          </p>
          <div className="grid grid-cols-3 gap-3">
            {CLASSES.map((cls) => {
              const isSelected = selectedClass === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls.id)}
                  className="game-card text-center cursor-pointer transition-all"
                  style={{
                    borderColor: isSelected ? "var(--gold)" : "var(--border-default)",
                    background:  isSelected ? "rgba(200,136,42,0.08)" : "var(--surface-card)",
                    boxShadow:   isSelected ? "0 0 16px rgba(200,136,42,0.15)" : "none",
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center mb-2 mx-auto"
                    style={{
                      width: 40, height: 40,
                      border: `2px solid ${isSelected ? "var(--gold)" : "var(--border-accent)"}`,
                      background: "var(--surface-elevated)",
                      fontSize: 20,
                    }}
                  >
                    {cls.icon}
                  </div>
                  <div className="font-cinzel mb-1.5" style={{ fontSize: "0.5rem", color: isSelected ? "var(--gold-light)" : "var(--text-primary)" }}>
                    {cls.name.toUpperCase()}
                  </div>
                  <div className="font-cinzel mb-1.5" style={{ fontSize: "0.42rem", color: "var(--color-heal)", background: "rgba(114,184,96,0.08)", border: "1px solid rgba(114,184,96,0.3)", display: "inline-block", padding: "1px 6px" }}>
                    {cls.bonus}
                  </div>
                  <p className="font-crimson" style={{ fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                    {cls.lore}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={handleCreate} size="lg" className="w-full torch-glow" disabled={name.trim().length < 3}>
          ▶ COMMENCER L&apos;AVENTURE
        </Button>

        <p className="text-center mt-4 font-crimson" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
          La classe ne verrouille aucun métier. Tous les arts sont accessibles.
        </p>
      </div>
    </div>
  );
}
