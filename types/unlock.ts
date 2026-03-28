import type { SkillId } from './game'

// ──────────────────────────────────────────────
// Unlock condition types (composable, recursive)
// ──────────────────────────────────────────────

export type UnlockCondition =
  | { type: 'resource';   resourceId: string; amount: number }
  | { type: 'skillLevel'; skillId: SkillId;   level: number }
  | { type: 'craftFlag';  flag: string }          // e.g. "bridge_repaired"
  | { type: 'AND';        conditions: UnlockCondition[] }
  | { type: 'OR';         conditions: UnlockCondition[] }

// ──────────────────────────────────────────────
// What kind of entity can be locked
// ──────────────────────────────────────────────

export type LockableKind = 'skill' | 'action' | 'recipe'

export interface UnlockEvent {
  kind:      LockableKind
  id:        string       // "woodcutting" | "cut_oak" | "smelt_copper"
  skillId?:  string       // populated for actions (parent skill)
  name:      string       // display name for the unlock notification
}

// ──────────────────────────────────────────────
// Persistence key convention
// Stored as entries in GameState.unlockedFlags
// ──────────────────────────────────────────────

export function unlockFlagKey(kind: LockableKind, id: string): string {
  return `_unlock_${kind}_${id}`
}

export function isUnlocked(
  kind: LockableKind,
  id: string,
  unlockedFlags: string[],
): boolean {
  return unlockedFlags.includes(unlockFlagKey(kind, id))
}
