import { describe, it, expect } from "vitest";
import { getXpForLevel, getXpToNextLevel, getLevelForXp, getLevelProgress } from "./xp-calc";

describe("XP Calculation Library", () => {
  describe("getXpForLevel", () => {
    it("should return 0 for level 1", () => {
      expect(getXpForLevel(1)).toBe(0);
    });

    it("should return 83 for level 2", () => {
      expect(getXpForLevel(2)).toBe(83);
    });

    it("should return 5181 for level 10", () => {
      expect(getXpForLevel(10)).toBe(5181);
    });

    it("should return 103973745 for level 99", () => {
      expect(getXpForLevel(99)).toBe(103973745);
    });

    it("should clamp levels below 1 to level 1", () => {
      expect(getXpForLevel(0)).toBe(0);
      expect(getXpForLevel(-5)).toBe(0);
    });

    it("should cap at level 120 (MASTERY_MAX) for levels above 120", () => {
      const xpAt120 = getXpForLevel(120);
      expect(getXpForLevel(121)).toBe(xpAt120);
    });
  });

  describe("getXpToNextLevel", () => {
    it("should return 83 for level 1", () => {
      expect(getXpToNextLevel(1)).toBe(83); // getXpForLevel(2) - getXpForLevel(1) = 83 - 0
    });

    it("should return 164 for level 2", () => {
      expect(getXpToNextLevel(2)).toBe(164); // getXpForLevel(3) - getXpForLevel(2) = 247 - 83
    });

    it("should return Infinity for level 120 (MASTERY_MAX)", () => {
      expect(getXpToNextLevel(120)).toBe(Infinity);
    });
  });

  describe("getLevelForXp", () => {
    it("should return level 1 for 0 XP", () => {
      expect(getLevelForXp(0)).toBe(1);
    });

    it("should return level 1 for 82 XP", () => {
      expect(getLevelForXp(82)).toBe(1);
    });

    it("should return level 2 for 83 XP", () => {
      expect(getLevelForXp(83)).toBe(2);
    });

    it("should return level 10 for 5181 XP", () => {
      expect(getLevelForXp(5181)).toBe(10);
    });

    it("should return level 99 for 103973745 XP", () => {
      expect(getLevelForXp(103973745)).toBe(99);
    });
  });

  describe("getLevelProgress", () => {
    it("should return 0 for exactly level-start XP", () => {
      expect(getLevelProgress(0)).toBe(0); // Level 1
      expect(getLevelProgress(83)).toBe(0); // Level 2
    });

    it("should return 0.5 for half-way XP between level 1 and 2", () => {
      const halfway = 83 / 2;
      expect(getLevelProgress(halfway)).toBeCloseTo(0.5, 5);
    });

    it("should return 1 for levels >= MASTERY_MAX", () => {
      const xpAt120 = getXpForLevel(120);
      expect(getLevelProgress(xpAt120)).toBe(1);
    });

    it("should return 1 for XP beyond MASTERY_MAX", () => {
      const xpAt120 = getXpForLevel(120);
      expect(getLevelProgress(xpAt120 + 1000000)).toBe(1);
    });

    it("should not exceed 1 even if XP is just below next level", () => {
      const xpJustBelowLevel2 = 82;
      expect(getLevelProgress(xpJustBelowLevel2)).toBeLessThan(1);
    });

    it("should return NaN when XP is NaN", () => {
      expect(getLevelProgress(NaN)).toBeNaN();
    });

    it("should handle Infinity XP properly", () => {
      // getLevelForXp(Infinity) will return 120 (MASTERY_MAX)
      // getLevelProgress for MASTERY_MAX returns 1
      expect(getLevelProgress(Infinity)).toBe(1);
    });

    it("should handle negative XP appropriately", () => {
      // getLevelForXp(-100) returns 1
      // getXpToNextLevel(1) returns 83
      // xpAtLevel is 0
      // progress is (-100 - 0) / 83 = -1.204...
      // Math.min(-1.204..., 1) is negative
      expect(getLevelProgress(-100)).toBeLessThan(0);
    });

  });
});
