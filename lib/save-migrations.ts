import { GameState } from '../types/game'

export const SAVE_VERSION = 5

type MigrationFn = (state: Record<string, any>) => Record<string, any>

const migrations: Record<number, MigrationFn> = {
  // v1 → v2 : ajout du système d'upgrades
  1: (s) => ({ ...s, upgrades: {}, unlockedFlags: [] }),

  // v2 → v3 : combat décomposé en 8 skills
  2: (s) => ({
    ...s,
    skills: {
      ...s.skills,
      // Migrer l'ancien skill 'combat' vers 'attack' + stats dérivées
      attack:       { level: s.skills.combat?.level ?? 1, xp: s.skills.combat?.xp ?? 0, activeAction: null, actionStartedAt: null },
      strength:     { level: 1, xp: 0, activeAction: null, actionStartedAt: null },
      ranged:       { level: 1, xp: 0, activeAction: null, actionStartedAt: null },
      magic:        { level: 1, xp: 0, activeAction: null, actionStartedAt: null },
      defense:      { level: 1, xp: 0, activeAction: null, actionStartedAt: null },
      dodge:        { level: 1, xp: 0, activeAction: null, actionStartedAt: null },
      constitution: { level: s.skills.combat?.level ?? 1, xp: 0, activeAction: null, actionStartedAt: null },
      prayer:       { level: 1, xp: 0, activeAction: null, actionStartedAt: null },
    },
  }),

  // v3 → v4 : Ajout de l'encyclopédie
  3: (s) => ({
    ...s,
    discoveredItems: s.discoveredItems ?? [],
  }),

  // v4 → v5 : Emplacements de consommables rapides
  4: (s) => ({
    ...s,
    consumableSlots: [null, null] as [null, null],
  }),
}

export function migrateSave(raw: Record<string, any>): GameState {
  let state = JSON.parse(JSON.stringify(raw))  // ne jamais muter l'original
  const startVersion = state.version ?? 1

  for (let v = startVersion; v < SAVE_VERSION; v++) {
    const migrate = migrations[v]
    if (!migrate) throw new Error(`No migration from v${v} to v${v + 1}`)
    state = { ...migrate(state), version: v + 1 }
    console.info(`[Save] Migrated from v${v} to v${v + 1}`)
  }
  return state as GameState
}
