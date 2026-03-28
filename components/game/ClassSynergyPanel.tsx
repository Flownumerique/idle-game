'use client'

import { useGameStore }       from '@/stores/game-store'
import { CLASS_SYNERGIES, SYNERGY_STATE_KEYS } from '@/types/class-synergy'
import { isSynergyUnlocked }  from '@/engine/class-synergy-engine'
import { evaluateCondition }  from '@/engine/unlock-engine'
import { getLevelForXp }      from '@/lib/xp-calc'
import ProgressBar            from '@/components/ui/ProgressBar'

// ──────────────────────────────────────────────
// Static metadata
// ──────────────────────────────────────────────

const CLASS_META: Record<string, { label: string; icon: string; color: string; border: string }> = {
  warrior:  { label: 'Guerrier',   icon: '⚔️',  color: 'rgba(245,158,11,0.9)',  border: 'rgba(245,158,11,0.3)'  },
  forester: { label: 'Forestier',  icon: '🌿',  color: 'rgba(34,197,94,0.9)',   border: 'rgba(34,197,94,0.3)'   },
  mage:     { label: 'Mage',       icon: '✨',  color: 'rgba(168,85,247,0.9)',  border: 'rgba(168,85,247,0.3)'  },
}

// ──────────────────────────────────────────────
// Condition progress row (one skill requirement)
// ──────────────────────────────────────────────

function ConditionRow({
  skillId,
  required,
  current,
}: {
  skillId: string
  required: number
  current: number
}) {
  const met      = current >= required
  const progress = Math.min(current / required, 1)
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span
          className="font-cinzel tracking-wide uppercase"
          style={{ fontSize: '0.45rem', color: met ? 'var(--color-xp)' : 'var(--text-secondary)' }}
        >
          {skillId}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: '0.5rem', color: met ? 'var(--color-xp)' : 'var(--text-muted)' }}
        >
          {current} / {required} {met ? '✓' : ''}
        </span>
      </div>
      <ProgressBar value={progress} height="h-1" color={met ? 'bg-emerald-500' : 'bg-slate-600'} />
    </div>
  )
}

// ──────────────────────────────────────────────
// Runtime status badge (warrior fury stacks etc.)
// ──────────────────────────────────────────────

function WarriorStatus({ synergyState }: { synergyState: Record<string, number> }) {
  const stacks   = synergyState[SYNERGY_STATE_KEYS.furyStacks]      ?? 0
  const lastKill = synergyState[SYNERGY_STATE_KEYS.furyLastKillAt]  ?? 0
  const expired  = lastKill > 0 && (Date.now() - lastKill) >= 60_000
  const active   = stacks > 0 && !expired

  return (
    <div
      className="flex items-center justify-between rounded-sm px-2 py-1.5 mt-2"
      style={{
        background: active ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <span className="font-cinzel tracking-widest uppercase" style={{ fontSize: '0.4rem', color: 'var(--text-muted)' }}>
        Furie
      </span>
      <span className="font-mono font-bold" style={{ fontSize: '0.7rem', color: active ? 'rgba(245,158,11,0.9)' : 'var(--text-muted)' }}>
        {active ? `${stacks} / 20` : '0 / 20'}
      </span>
      <span style={{ fontSize: '0.7rem' }}>{active ? '🔥' : '💤'}</span>
    </div>
  )
}

function MageStatus({ synergyState }: { synergyState: Record<string, number> }) {
  const bonusUntil = synergyState[SYNERGY_STATE_KEYS.magePotionBonusUntil] ?? 0
  const active     = Date.now() < bonusUntil
  const remaining  = active ? Math.ceil((bonusUntil - Date.now()) / 1000) : 0

  return (
    <div
      className="flex items-center justify-between rounded-sm px-2 py-1.5 mt-2"
      style={{
        background: active ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <span className="font-cinzel tracking-widest uppercase" style={{ fontSize: '0.4rem', color: 'var(--text-muted)' }}>
        Bonus XP
      </span>
      <span className="font-mono font-bold" style={{ fontSize: '0.6rem', color: active ? 'rgba(168,85,247,0.9)' : 'var(--text-muted)' }}>
        {active ? `+20% · ${remaining}s` : 'Inactif'}
      </span>
      <span style={{ fontSize: '0.7rem' }}>{active ? '✨' : '💤'}</span>
    </div>
  )
}

function ForesterStatus({ synergyState }: { synergyState: Record<string, number> }) {
  const lastAt    = synergyState[SYNERGY_STATE_KEYS.forestLastHarvestAt] ?? 0
  const nextIn    = lastAt > 0 ? Math.max(0, Math.ceil((lastAt + 30_000 - Date.now()) / 1000)) : 0

  return (
    <div
      className="flex items-center justify-between rounded-sm px-2 py-1.5 mt-2"
      style={{
        background: 'rgba(34,197,94,0.05)',
        border: '1px solid rgba(34,197,94,0.2)',
      }}
    >
      <span className="font-cinzel tracking-widest uppercase" style={{ fontSize: '0.4rem', color: 'var(--text-muted)' }}>
        Récolte
      </span>
      <span className="font-mono" style={{ fontSize: '0.6rem', color: 'rgba(34,197,94,0.8)' }}>
        {nextIn > 0 ? `dans ${nextIn}s` : 'Prête'}
      </span>
      <span style={{ fontSize: '0.7rem' }}>🌿</span>
    </div>
  )
}

// ──────────────────────────────────────────────
// Individual synergy card
// ──────────────────────────────────────────────

function SynergyCard({
  synergy,
  unlocked,
  skills,
  synergyState,
}: {
  synergy:      (typeof CLASS_SYNERGIES)[number]
  unlocked:     boolean
  skills:       Record<string, { xp: number; level: number }>
  synergyState: Record<string, number>
}) {
  const meta = CLASS_META[synergy.classId]

  // Extract individual skill conditions from the AND wrapper
  const conditions =
    synergy.condition.type === 'AND'
      ? synergy.condition.conditions.filter(c => c.type === 'skillLevel')
      : synergy.condition.type === 'skillLevel'
        ? [synergy.condition]
        : []

  return (
    <div
      className="rounded-sm p-3 space-y-2.5"
      style={{
        background: unlocked ? `rgba(${meta.color.slice(5, -0.2)}, 0.04)` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${unlocked ? meta.border : 'rgba(255,255,255,0.06)'}`,
        opacity: unlocked ? 1 : 0.75,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div
            className="font-cinzel tracking-wide"
            style={{ fontSize: '0.55rem', color: unlocked ? meta.color : 'var(--text-secondary)' }}
          >
            {synergy.name}
          </div>
          <div
            className="font-cinzel tracking-widest uppercase"
            style={{ fontSize: '0.38rem', color: 'var(--text-muted)' }}
          >
            {meta.label}
          </div>
        </div>
        {unlocked && (
          <span
            className="font-cinzel"
            style={{ fontSize: '0.45rem', color: 'var(--color-xp)', whiteSpace: 'nowrap' }}
          >
            ✓ Actif
          </span>
        )}
      </div>

      {/* Description */}
      <p className="font-crimson leading-relaxed" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        {synergy.description}
      </p>

      {/* Condition rows */}
      <div className="space-y-1.5">
        {conditions.map(c => {
          if (c.type !== 'skillLevel') return null
          const level = getLevelForXp(skills[c.skillId]?.xp ?? 0)
          return (
            <ConditionRow
              key={c.skillId}
              skillId={c.skillId}
              required={c.level}
              current={level}
            />
          )
        })}
      </div>

      {/* Runtime status — only when unlocked */}
      {unlocked && synergy.effect.type === 'kill_stacks'    && <WarriorStatus  synergyState={synergyState} />}
      {unlocked && synergy.effect.type === 'potion_xp_bonus' && <MageStatus     synergyState={synergyState} />}
      {unlocked && synergy.effect.type === 'passive_harvest' && <ForesterStatus synergyState={synergyState} />}
    </div>
  )
}

// ──────────────────────────────────────────────
// Panel
// ──────────────────────────────────────────────

export default function ClassSynergyPanel() {
  const skills       = useGameStore(s => s.skills)
  const unlockedFlags = useGameStore(s => s.unlockedFlags)
  const synergyState  = useGameStore(s => s.synergyState ?? {})

  // Build a fake partial state for isSynergyUnlocked
  const partialState = { unlockedFlags } as { unlockedFlags: string[] }

  return (
    <div className="game-card space-y-3">
      <div className="section-title">Synergies de Classe</div>
      <p className="font-crimson text-xs" style={{ color: 'var(--text-muted)' }}>
        Débloquez des bonus passifs permanents en atteignant les seuils de compétences ci-dessous.
      </p>
      <div className="space-y-3">
        {CLASS_SYNERGIES.map(synergy => (
          <SynergyCard
            key={synergy.id}
            synergy={synergy}
            unlocked={isSynergyUnlocked(synergy.id, partialState as Parameters<typeof isSynergyUnlocked>[1])}
            skills={skills}
            synergyState={synergyState}
          />
        ))}
      </div>
    </div>
  )
}
