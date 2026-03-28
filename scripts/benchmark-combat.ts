import { simulateCombatsOffline } from "../engine/combat-engine";
import { mulberry32 } from "../lib/rng";
import type { PlayerStats } from "../types/game";
import { performance } from "perf_hooks";

const ZONE_ID = "plains_start"; // Actual zone from zones_monsters.json

const MOCK_PLAYER_STATS: PlayerStats = {
  maxHp: 500,
  attack: 120,
  defense: 80,
  attackSpeed: 1.5,
  dodgeChance: 0.1,
  critChance: 0.1,
  hpRegen: 5,
  prayerBonus: 1.0,
  activeStyle: "attack",
  blockChance: 0.0,
  furyDamageMultiplier: 1.0,
  magicXpMultiplier: 1.0,
  xpMultiplier: 1.0,
  harvestMultiplier: 1.0,
};

const SIMULATION_MS = 100 * 3600 * 1000; // 100 hours

function runBenchmark() {
  const rng = mulberry32(12345); // deterministic seed

  console.log(`Simulating ${SIMULATION_MS / 3600000} hours of offline combat...`);

  const start = performance.now();

  const result = simulateCombatsOffline(
    ZONE_ID,
    MOCK_PLAYER_STATS,
    MOCK_PLAYER_STATS.maxHp,
    SIMULATION_MS,
    rng
  );

  const elapsed = performance.now() - start;

  console.log(`Simulation complete!`);
  console.log(`Elapsed time: ${elapsed.toFixed(2)}ms`);
  console.log(`Fights: ${result.fights}, Wins: ${result.wins}, Deaths: ${result.deaths}, Gold: ${result.gold}`);
}

runBenchmark();
