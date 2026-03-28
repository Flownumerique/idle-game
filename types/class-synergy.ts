import type { UnlockCondition } from './unlock'
import type { SkillId } from './game'

// ──────────────────────────────────────────────
// Class identifier — mirrors PlayerClass
// ──────────────────────────────────────────────

export type ClassId = 'warrior' | 'forester' | 'mage'

// ──────────────────────────────────────────────
// Passive effect variants
// ──────────────────────────────────────────────

export type PassiveEffect =
  | {
      /** Per-kill stacking damage bonus that expires without kills */
      type:          'kill_stacks'
      bonusPerStack: number   // e.g. 0.01 → +1% per stack
      maxStacks:     number
      expiryMs:      number   // ms since last kill before stacks reset
      statAffected:  'attack'
    }
  | {
      /** Free resource tick on a fixed interval, even during combat */
      type:       'passive_harvest'
      intervalMs: number
    }
  | {
      /** Potion use triggers a timed XP rate bonus for a skill */
      type:            'potion_xp_bonus'
      skillId:         SkillId
      bonusMultiplier: number   // e.g. 1.2 → +20%
      durationMs:      number
    }

// ──────────────────────────────────────────────
// Synergy definition (static data)
// ──────────────────────────────────────────────

export interface ClassSynergy {
  id:          string
  classId:     ClassId
  name:        string
  description: string
  /** Reuses the composable unlock condition system */
  condition:   UnlockCondition
  effect:      PassiveEffect
}

// ──────────────────────────────────────────────
// Static synergy catalogue
// ──────────────────────────────────────────────

export const CLASS_SYNERGIES: ClassSynergy[] = [
  {
    id:      'warrior_berserker_fury',
    classId: 'warrior',
    name:    'Furie Berseker',
    description:
      'Chaque kill donne un stack Furie (+1% dégâts, max 20). ' +
      'Les stacks disparaissent 60s après le dernier kill.',
    condition: {
      type: 'AND',
      conditions: [
        { type: 'skillLevel', skillId: 'attack',   level: 20 },
        { type: 'skillLevel', skillId: 'strength', level: 20 },
      ],
    },
    effect: {
      type:          'kill_stacks',
      bonusPerStack: 0.01,
      maxStacks:     20,
      expiryMs:      60_000,
      statAffected:  'attack',
    },
  },
  {
    id:      'forester_natural_symbiosis',
    classId: 'forester',
    name:    'Symbiose Naturelle',
    description:
      'Génère passivement 1 unité de la ressource la plus présente en inventaire ' +
      'toutes les 30 secondes, même en combat.',
    condition: {
      type: 'AND',
      conditions: [
        { type: 'skillLevel', skillId: 'woodcutting', level: 15 },
        { type: 'skillLevel', skillId: 'ranged',      level: 15 },
      ],
    },
    effect: {
      type:       'passive_harvest',
      intervalMs: 30_000,
    },
  },
  {
    id:      'mage_alchemical_catalysis',
    classId: 'mage',
    name:    'Catalyse Alchimique',
    description:
      "Les potions consommées octroient +20% d'XP en Magie " +
      "pendant leur durée d'effet (2 min).",
    condition: {
      type: 'AND',
      conditions: [
        { type: 'skillLevel', skillId: 'magic',   level: 20 },
        { type: 'skillLevel', skillId: 'alchemy', level: 15 },
      ],
    },
    effect: {
      type:            'potion_xp_bonus',
      skillId:         'magic',
      bonusMultiplier:  1.2,
      durationMs:      120_000,
    },
  },
]

// ──────────────────────────────────────────────
// Persistence helpers
// ──────────────────────────────────────────────

/** Key stored in GameState.unlockedFlags when a synergy is unlocked */
export function synergySynergyFlagKey(synergyId: string): string {
  return `class_synergy_${synergyId}`
}

/**
 * Keys used in GameState.synergyState (Record<string, number>)
 * for runtime stack / timestamp tracking.
 */
export const SYNERGY_STATE_KEYS = {
  furyStacks:           'fury_stacks',
  furyLastKillAt:       'fury_last_kill_at',
  magePotionBonusUntil: 'mage_potion_bonus_until',
  forestLastHarvestAt:  'forest_last_harvest_at',
} as const
