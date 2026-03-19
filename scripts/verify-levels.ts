import { calculateGlobalLevels } from "../lib/xp-calc";
import { PROFESSION_SKILL_IDS, COMBAT_SKILL_IDS } from "../types/game";

const mockSkills: any = {};

// Level 10 XP is 5181
const XP_LVL_10 = 5181;

for (const id of PROFESSION_SKILL_IDS) {
  mockSkills[id] = { xp: XP_LVL_10 };
}

for (const id of COMBAT_SKILL_IDS) {
  mockSkills[id] = { xp: XP_LVL_10 };
}

const levels = calculateGlobalLevels(mockSkills);

console.log("Profession Level Sum:", levels.professionLevel);
console.log("Expected Profession:", PROFESSION_SKILL_IDS.length * 10);

console.log("Combat Level Sum:", levels.combatLevel);
console.log("Expected Combat:", COMBAT_SKILL_IDS.length * 10);

console.log("Total Level:", levels.totalLevel);
console.log("Expected Total:", (PROFESSION_SKILL_IDS.length + COMBAT_SKILL_IDS.length) * 10);

if (levels.totalLevel === (PROFESSION_SKILL_IDS.length + COMBAT_SKILL_IDS.length) * 10) {
  console.log("✅ Verification SUCCESS");
} else {
  console.log("❌ Verification FAILED");
  process.exit(1);
}
