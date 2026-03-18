import { describe, it, expect } from "vitest";
import { calcDamage } from "../combat-engine";
import {
  DEF_PENETRATION,
  CRIT_MULTIPLIER,
  BLOCK_REDUCTION,
  MAX_CRIT_CHANCE,
} from "../constants";

// Helper RNGs for testing
const mockRng = (value: number) => () => value;

const seqRng = (values: number[]) => {
  let i = 0;
  return () => values[i++];
};

describe("calcDamage", () => {
  /*
   * IMPORTANT: Deterministic RNG Order Documentation
   *
   * The `calcDamage` function relies on RNG to determine outcomes, and the tests
   * enforce strict determinism by ensuring the order of RNG calls is consistent.
   * If the sequence of `rng()` calls in `calcDamage` changes, these tests WILL fail,
   * which is an expected safety measure to ensure changes to the formula are intentional.
   *
   * Current sequence of RNG calls:
   * 1. `isCrit` check (if critChance > 0)
   * 2. `isBlocked` check (if shieldBlockChance > 0)
   * 3. `randFloat` for damage variance (this calls `rng()` once internally)
   */

  describe("Normal damage calculation", () => {
    it("should calculate base damage correctly within the variance range (neutral variance)", () => {
      const atk = 100;
      const def = 50;
      const precision = 0; // No crit
      const blockChance = 0; // No block
      // With precision=0 and block=0, RNG is still called for randFloat.
      // randFloat(rng, 0.9, 1.1) scales rng() to 0.9 + rng() * 0.2
      // Using rng() = 0.5 gives a 1.0 multiplier.
      const rng = seqRng([
        0.5, // 1. isCrit: fails (0.5 >= 0)
        // isBlocked short-circuits (blockChance = 0)
        0.5, // 2. randFloat: yields exactly 1.0 multiplier (0.9 + 0.5 * 0.2)
      ]);

      const result = calcDamage(atk, def, precision, blockChance, rng);

      const expectedBaseDmg = Math.floor((atk - def * DEF_PENETRATION) * 1.0); // 100 - (50 * 0.4) = 80

      expect(result.dmg).toBe(expectedBaseDmg);
      expect(Number.isInteger(result.dmg)).toBe(true);
      expect(result.isCrit).toBe(false);
      expect(result.isBlocked).toBe(false);
    });

    it("should guarantee a minimum of 1 damage, even if defense is significantly higher", () => {
      const atk = 10;
      const def = 9999;
      const rng = mockRng(0.5); // Use 0.5 for all RNG calls

      const result = calcDamage(atk, def, 0, 0, rng);

      expect(result.dmg).toBe(1);
    });

    it("should guarantee a minimum of 1 damage when attack is 0", () => {
      const atk = 0;
      const def = 10;
      const rng = mockRng(0.5);

      const result = calcDamage(atk, def, 0, 0, rng);

      expect(result.dmg).toBe(1);
    });

    it("should correctly calculate damage variance on the lower end", () => {
      const atk = 100;
      const def = 50; // base: 80
      const rng = seqRng([0.5, 0.0]); // 0.0 in randFloat yields 0.9 multiplier (80 * 0.9 = 72)

      const result = calcDamage(atk, def, 0, 0, rng);

      expect(result.dmg).toBe(72);
      expect(Number.isInteger(result.dmg)).toBe(true);
    });

    it("should correctly calculate damage variance on the higher end", () => {
      const atk = 100;
      const def = 50; // base: 80
      const rng = seqRng([0.5, 0.99999]); // rng ~1.0 in randFloat yields ~1.1 multiplier (80 * 1.099998 = 87.99984 -> floor to 87)

      const result = calcDamage(atk, def, 0, 0, rng);

      expect(result.dmg).toBe(87);
      expect(Number.isInteger(result.dmg)).toBe(true);
    });
  });

  describe("Critical hits", () => {
    it("should multiply damage when RNG is below the critical threshold", () => {
      const atk = 100;
      const def = 50; // base: 80
      // precision of 40 yields 40/200 = 0.2 (20% crit chance)
      const precision = 40;

      const rng = seqRng([
        0.1, // 1. isCrit: succeeds (0.1 < 0.2)
        0.5, // 2. randFloat: neutral multiplier 1.0
      ]);

      const result = calcDamage(atk, def, precision, 0, rng);

      const expectedBaseDmg = Math.floor((atk - def * DEF_PENETRATION) * 1.0);
      const expectedDmg = Math.floor(expectedBaseDmg * CRIT_MULTIPLIER);

      expect(result.dmg).toBe(expectedDmg);
      expect(result.isCrit).toBe(true);
    });

    it("should cap the crit chance at MAX_CRIT_CHANCE", () => {
      const atk = 100;
      const def = 50; // base: 80
      // precision = 10000 -> 10000/200 = 50 -> capped at MAX_CRIT_CHANCE (0.4)
      const precision = 10000;

      const rngSuccess = seqRng([
        MAX_CRIT_CHANCE - 0.01, // Just below the cap -> Crit
        0.5
      ]);
      const resultSuccess = calcDamage(atk, def, precision, 0, rngSuccess);
      expect(resultSuccess.isCrit).toBe(true);

      const rngFail = seqRng([
        MAX_CRIT_CHANCE + 0.01, // Just above the cap -> No Crit
        0.5
      ]);
      const resultFail = calcDamage(atk, def, precision, 0, rngFail);
      expect(resultFail.isCrit).toBe(false);
    });
  });

  describe("Block mechanics", () => {
    it("should reduce damage when RNG is below the block threshold", () => {
      const atk = 100;
      const def = 50; // base: 80
      const blockChance = 0.3;

      const rng = seqRng([
        0.5, // 1. isCrit: fails (0.5 > 0)
        0.2, // 2. isBlocked: succeeds (0.2 < 0.3)
        0.5, // 3. randFloat: neutral multiplier 1.0
      ]);

      const result = calcDamage(atk, def, 0, blockChance, rng);

      const expectedBaseDmg = Math.floor((atk - def * DEF_PENETRATION) * 1.0);
      const expectedDmg = Math.floor(expectedBaseDmg * BLOCK_REDUCTION);

      expect(result.dmg).toBe(expectedDmg);
      expect(result.isBlocked).toBe(true);
    });

    it("should never block if block chance is 0", () => {
      const atk = 100;
      const def = 50;

      // Even if RNG is 0, isBlocked short-circuits to false
      const rng = seqRng([0.5, 0.0]);

      const result = calcDamage(atk, def, 0, 0, rng);

      expect(result.isBlocked).toBe(false);
    });

    it("should always block if block chance is 1.0", () => {
      const atk = 100;
      const def = 50;
      const blockChance = 1.0;

      const rng = seqRng([
        0.5, // 1. isCrit: fails
        0.99, // 2. isBlocked: succeeds (0.99 < 1.0)
        0.5  // 3. randFloat: neutral multiplier
      ]);

      const result = calcDamage(atk, def, 0, blockChance, rng);

      expect(result.isBlocked).toBe(true);
    });
  });

  describe("Combined Crit and Block", () => {
    it("should apply crit first, then block when both trigger", () => {
      const atk = 100;
      const def = 50; // base: 80
      const precision = 40; // 40/200 = 0.2
      const blockChance = 0.3;

      const rng = seqRng([
        0.1, // 1. isCrit: succeeds (0.1 < 0.2)
        0.2, // 2. isBlocked: succeeds (0.2 < 0.3)
        0.5, // 3. randFloat: neutral multiplier 1.0
      ]);

      const result = calcDamage(atk, def, precision, blockChance, rng);

      // The order must be applied consistently to avoid rounding discrepancies
      const expectedBaseDmg = Math.floor((atk - def * DEF_PENETRATION) * 1.0);
      let expectedDmg = expectedBaseDmg;
      expectedDmg = Math.floor(expectedDmg * CRIT_MULTIPLIER);
      expectedDmg = Math.floor(expectedDmg * BLOCK_REDUCTION);

      expect(result.dmg).toBe(expectedDmg);
      expect(result.isCrit).toBe(true);
      expect(result.isBlocked).toBe(true);
    });
  });

  describe("NaN Handling", () => {
    it("should prevent NaN propagation and return 1 damage", () => {
      const atk = NaN;
      const def = 50;
      const rng = mockRng(0.5);

      const result = calcDamage(atk, def, 0, 0, rng);

      expect(result.dmg).toBe(1);
      expect(Number.isNaN(result.dmg)).toBe(false);
      expect(result.isCrit).toBe(false);
      expect(result.isBlocked).toBe(false);
    });

    it("should prevent NaN propagation if defense is NaN", () => {
      const rng = mockRng(0.5);
      const result = calcDamage(100, NaN, 0, 0, rng);
      expect(result.dmg).toBe(1);
    });

    it("should prevent NaN propagation if precision is NaN", () => {
      const rng = mockRng(0.5);
      const result = calcDamage(100, 50, NaN, 0, rng);
      expect(result.dmg).toBe(1);
    });

    it("should prevent NaN propagation if blockChance is NaN", () => {
      const rng = mockRng(0.5);
      const result = calcDamage(100, 50, 0, NaN, rng);
      expect(result.dmg).toBe(1);
    });
  });
});
