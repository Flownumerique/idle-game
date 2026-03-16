"use client";

import { useGameStore } from "@/stores/game-store";
import CharacterCreation from "@/components/game/CharacterCreation";
import GameLayout from "@/components/game/GameLayout";

export default function Home() {
  const playerName = useGameStore((s) => s.player.name);

  if (!playerName) {
    return <CharacterCreation />;
  }

  return <GameLayout />;
}
