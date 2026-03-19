# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Idle Realms** is a browser-based idle RPG built with Next.js 14, React 18, TypeScript, and Zustand. Players progress through collection skills, combat, crafting, farming, and quests while the game runs offline.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run start        # Run production server
npm run lint         # Run linting
npm run type-check   # TypeScript check without emit
npm run test         # Run all tests once
npm run test:watch   # Watch mode for tests
```

**Run a single test file:**
```bash
npx vitest run engine/__tests__/combat-engine.test.ts
```

## Architecture

### Separation of Concerns

The codebase has a strict separation between game logic and UI:

- **`engine/`** — Pure TypeScript game engines with no React dependencies. All business logic lives here and is independently unit-testable.
- **`stores/game-store.ts`** — Zustand store that is the single source of truth for all game state. Persisted to localStorage under key `idle-realms-save`.
- **`hooks/useGameLoop.ts`** — React hook running a RAF-based tick that calls engine functions and commits results to the store. Also handles offline recovery on mount and auto-save every 30s.
- **`components/`** — React UI only. Reads from the store, dispatches store actions.

### Engine Modules

Each engine is a pure TypeScript module; engines do not import each other. Cross-engine communication uses the typed event bus.

| Engine | Responsibility |
|---|---|
| `engine/skill-engine.ts` | Skill action ticks, tool speed bonuses, XP/loot accumulation |
| `engine/combat-engine.ts` | Turn-based hit resolution, crit/dodge/block, monster spawning, loot drops |
| `engine/craft-engine.ts` | Recipe matching, resource consumption |
| `engine/offline-engine.ts` | Delta-time offline progress calculation (capped at 48h/72h) |
| `engine/quest-engine.ts` | Objective tracking, quest completion, reward application |
| `engine/market-engine.ts` | Dynamic pricing via supply/demand |
| `engine/data-loader.ts` | O(1) lookups for all JSON game data (`GameData.item(id)`, `.skill()`, `.monster()`, `.zone()`, `.quest()`) |
| `engine/event-bus.ts` | Typed singleton event bus connecting engines to the rest of the game |

### Game Data (JSON)

All game content is data-driven — no hardcoded values in engines:

- `items.json` — All items (resources, equipment, consumables)
- `skills.json` — 15 skills, actions per skill, XP table
- `recipes.json` — Crafting recipes
- `zones_monsters.json` — Zones and monster definitions
- `quests.json` — Quest definitions with objectives and rewards

To add new content (items, monsters, skills, quests), edit the JSON files. `engine/data-loader.ts` validates references at startup.

### Key Libraries

- **RNG**: `lib/rng.ts` — Mulberry32 seeded PRNG. Offline calculations are deterministic via seed = last save timestamp.
- **XP/Leveling**: `lib/xp-calc.ts` — Level range 1–120. XP table loaded from `skills.json`.
- **Feature Flags**: `lib/feature-flags.ts` — Environment-controlled toggles (e.g. `ENABLE_CLOUD_SAVE`, `ENABLE_OFFLINE_PROGRESS`, `ENABLE_DYNAMIC_MARKET`).
- **Storage Adapter**: `lib/storage/storage-adapter.ts` — Abstract interface with `SupabaseAdapter` (cloud) and `LocalStorageAdapter` (guest/fallback) implementations. `MockAdapter` is available for tests.
- **Save Migrations**: `lib/save-migrations.ts` — Handles versioned save file upgrades.

### Game Balance Constants

All tuning values live in `engine/constants.ts`:
- `MAX_OFFLINE_MS` = 48 hours, `GRIMOIRE_OFFLINE_MS` = 72 hours
- `MIN_ACTION_DURATION_S` = 1.5s
- `CRIT_MULTIPLIER` = 2.0, `MAX_CRIT_CHANCE` = 0.4
- `BLOCK_REDUCTION` = 0.6 (40% mitigation), `DEF_PENETRATION` = 0.4
- `DEATH_REVIVE_HP_PCT` = 0.3
- `AUTO_SAVE_INTERVAL_MS` = 30s, `UI_TICK_INTERVAL_MS` = 250ms

## Testing

Tests live in `engine/__tests__/`. All engine logic should be tested against pure functions — no React, no store mocking required. Use `MockAdapter` for storage tests.

## TypeScript

Strict mode is enabled. Path alias `@/*` maps to the project root. Run `npm run type-check` before committing engine changes.
