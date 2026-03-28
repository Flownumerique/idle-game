'use client'

import { useMemo }           from 'react'
import { useGameStore }      from '@/stores/game-store'
import { computeActiveGoals } from '@/engine/goal-calculator'
import type { GoalEntry, GoalCondition } from '@/engine/goal-calculator'
import ProgressBar           from '@/components/ui/ProgressBar'

// ──────────────────────────────────────────────
// Static metadata
// ──────────────────────────────────────────────

const KIND_META: Record<string, { label: string; accent: string; barColor: string }> = {
  zone:    { label: 'Zone',       accent: 'rgba(59,130,246,0.8)',  barColor: 'bg-blue-500'   },
  synergy: { label: 'Synergie',   accent: 'rgba(245,158,11,0.8)',  barColor: 'bg-amber-500'  },
  recipe:  { label: 'Recette',    accent: 'rgba(168,85,247,0.8)',  barColor: 'bg-purple-500' },
  skill:   { label: 'Compétence', accent: 'rgba(34,197,94,0.8)',   barColor: 'bg-emerald-500' },
}

// ──────────────────────────────────────────────
// Condition mini-row
// ──────────────────────────────────────────────

function ConditionRow({ cond }: { cond: GoalCondition }) {
  const progress = Math.min(cond.current / cond.required, 1)
  const met      = progress >= 1

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-1">
        <span
          className="font-cinzel tracking-wide truncate"
          style={{ fontSize: '0.42rem', color: met ? 'var(--color-xp)' : 'var(--text-muted)' }}
        >
          {cond.icon} {cond.label}
        </span>
        <span
          className="font-mono flex-shrink-0"
          style={{ fontSize: '0.45rem', color: met ? 'var(--color-xp)' : 'var(--text-secondary)' }}
        >
          {cond.current}/{cond.required}
        </span>
      </div>
      <ProgressBar
        value={progress}
        height="h-0.5"
        color={met ? 'bg-emerald-500' : 'bg-slate-500'}
      />
    </div>
  )
}

// ──────────────────────────────────────────────
// Single goal card
// ──────────────────────────────────────────────

function GoalCard({
  goal,
  onNavigate,
}: {
  goal:       GoalEntry
  onNavigate: (tab: string, section?: string) => void
}) {
  const meta         = KIND_META[goal.kind]
  const pct          = Math.round(goal.score * 100)

  return (
    <button
      className="w-full text-left rounded-sm p-2.5 space-y-2 transition-all hover:brightness-110 active:scale-[0.98]"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border:     `1px solid rgba(255,255,255,0.07)`,
      }}
      onClick={() => onNavigate(goal.navigateTo, goal.navigateSection)}
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{goal.icon}</span>
        <div className="flex-1 min-w-0">
          <div
            className="font-cinzel tracking-wide truncate"
            style={{ fontSize: '0.5rem', color: 'var(--text-primary)' }}
          >
            {goal.name}
          </div>
          <span
            className="font-cinzel tracking-widest uppercase"
            style={{ fontSize: '0.38rem', color: meta.accent }}
          >
            {meta.label}
          </span>
        </div>
        <span
          className="font-mono font-bold flex-shrink-0"
          style={{ fontSize: '0.5rem', color: meta.accent }}
        >
          {pct}%
        </span>
      </div>

      {/* Global progress bar */}
      <ProgressBar value={goal.score} height="h-1" color={meta.barColor} />

      {/* Per-condition rows */}
      <div className="space-y-1.5 pt-0.5">
        {goal.conditions.map((c, i) => (
          <ConditionRow key={i} cond={c} />
        ))}
      </div>
    </button>
  )
}

// ──────────────────────────────────────────────
// Panel
// ──────────────────────────────────────────────

interface ActiveGoalsProps {
  onNavigate: (tab: string, section?: string) => void
}

export default function ActiveGoals({ onNavigate }: ActiveGoalsProps) {
  // Subscribe to the slice of state the calculator actually reads
  const state = useGameStore()
  const goals = useMemo(() => computeActiveGoals(state), [
    // Only recalculate when these fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state.skills,
    state.inventory,
    state.unlockedFlags,
    state.discoveredItems,
    state.synergyState,
  ])

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-1">
        <span style={{ fontSize: '0.65rem' }}>🎯</span>
        <span
          className="font-cinzel tracking-widest uppercase font-bold"
          style={{ fontSize: '0.42rem', color: 'var(--text-muted)' }}
        >
          Objectifs proches
        </span>
      </div>

      {goals.length === 0 ? (
        <div
          className="rounded-sm p-3 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div style={{ fontSize: '1.2rem' }}>🏆</div>
          <p className="font-cinzel mt-1" style={{ fontSize: '0.42rem', color: 'var(--text-muted)' }}>
            Tout débloqué !
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}
