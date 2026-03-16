"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/game-store";
import type { PlayerClass } from "@/types/game";
import Button from "@/components/ui/Button";

const CLASSES: { id: PlayerClass; icon: string; name: string; bonus: string; startItem: string }[] = [
  { id: "warrior", icon: "⚔️", name: "Guerrier", bonus: "+10% dégâts corps à corps", startItem: "Épée en Fer" },
  { id: "forester", icon: "🌿", name: "Forestier", bonus: "+10% ressources collectées", startItem: "Hache" },
  { id: "mage", icon: "🔮", name: "Mage", bonus: "+10% dégâts magiques", startItem: "Bâton en Bois" },
];

export default function CharacterCreation() {
  const createCharacter = useGameStore((s) => s.createCharacter);
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<PlayerClass>("warrior");
  const [error, setError] = useState("");

  function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError("Le nom doit contenir au moins 3 caractères.");
      return;
    }
    if (trimmed.length > 20) {
      setError("Le nom ne peut pas dépasser 20 caractères.");
      return;
    }
    createCharacter(trimmed, selectedClass);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e] p-4">
      <div className="w-full max-w-lg">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gold mb-2">⚔️ Idle Realms</h1>
          <p className="text-slate-400">Créez votre aventurier</p>
        </div>

        {/* Name input */}
        <div className="game-card mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Nom du personnage
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Entrez un nom (3–20 caractères)"
            className="w-full bg-[#0f3460] border border-slate-600 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        {/* Class selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-300 mb-3">Choisissez votre classe</p>
          <div className="grid grid-cols-3 gap-3">
            {CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`game-card text-center cursor-pointer transition-all ${
                  selectedClass === cls.id
                    ? "border-blue-400 bg-[#0f3460]"
                    : "hover:border-slate-500"
                }`}
              >
                <div className="text-3xl mb-2">{cls.icon}</div>
                <div className="font-semibold text-slate-200 text-sm">{cls.name}</div>
                <div className="text-xs text-slate-400 mt-1">{cls.bonus}</div>
                <div className="text-xs text-slate-500 mt-1">Départ: {cls.startItem}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Create button */}
        <Button
          onClick={handleCreate}
          size="lg"
          className="w-full"
          disabled={name.trim().length < 3}
        >
          Commencer l&apos;aventure →
        </Button>

        <p className="text-center text-xs text-slate-500 mt-4">
          La classe ne verrouille aucun métier. Tous les métiers sont accessibles à terme.
        </p>
      </div>
    </div>
  );
}
