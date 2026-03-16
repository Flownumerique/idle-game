/**
 * Mulberry32 — fast seeded pseudo-random number generator.
 * Returns a function that produces floats in [0, 1).
 * Used for deterministic offline drop calculation.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max] */
export function randFloat(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Random int in [min, max] inclusive */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}
