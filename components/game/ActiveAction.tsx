'use client'

import { useRef, useEffect } from 'react'
import { useGameStore }          from '@/stores/game-store'
import { getAction, getActionDurationMs, getToolBonus } from '@/engine/skill-engine'
import { getCraftRecipe }        from '@/engine/crafting-engine'
import type { SkillId }          from '@/types/game'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Props {
  skillId: SkillId
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

/**
 * Shows when a craft loop or skill action is running for the given skill.
 * Progress bar is updated every animation frame by writing directly to
 * the DOM ref — no React re-renders during animation.
 */
export default function ActiveAction({ skillId }: Props) {
  // ── Reactive store slices (re-renders only on start / stop / cycle end) ──
  const activeCraft    = useGameStore(s => s.activeCraft)
  const activeActionId = useGameStore(s => s.skills[skillId]?.activeAction ?? null)
  const actionStartedAt = useGameStore(s => s.skills[skillId]?.actionStartedAt ?? null)
  const equipment      = useGameStore(s => s.equipment)
  const stopCraft      = useGameStore(s => s.stopCraft)
  const stopAction     = useGameStore(s => s.stopAction)

  const isCraft = activeCraft?.skillId === skillId
  const isSkill = !isCraft && activeActionId !== null
  const isActive = isCraft || isSkill

  // ── Display metadata (computed once per render, not in RAF) ──────────────
  let actionName    = ''
  let totalDurationS = 0
  let actionIcon    = ''
  let completedCount: number | null = null

  if (isCraft && activeCraft) {
    const recipe = getCraftRecipe(activeCraft.recipeId)
    actionName     = recipe?.name ?? activeCraft.recipeId
    totalDurationS = activeCraft.duration / 1000
    completedCount = activeCraft.completedCount
    actionIcon     = '🔨'
  } else if (isSkill && activeActionId) {
    const actionDef = getAction(skillId, activeActionId)
    actionName      = actionDef?.name ?? activeActionId
    const toolBonus = getToolBonus(equipment, skillId)
    totalDurationS  = actionDef ? getActionDurationMs(actionDef, toolBonus) / 1000 : 0
    actionIcon      = (actionDef as { icon?: string } | null)?.icon ?? ''
  }

  // ── DOM refs for RAF — no React re-renders during animation ──────────────
  const barRef  = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const rafRef  = useRef<number>(0)

  useEffect(() => {
    if (!isActive) return

    function frame() {
      const now   = Date.now()
      const state = useGameStore.getState()
      let pct     = 0
      let elapsed = 0
      let durMs   = 0

      const ac = state.activeCraft
      if (ac?.skillId === skillId) {
        durMs   = ac.duration
        elapsed = Math.min(now - ac.startedAt, durMs)
        pct     = (elapsed / durMs) * 100
      } else {
        const sk = state.skills[skillId]
        if (sk?.activeAction && sk.actionStartedAt) {
          const actionDef  = getAction(skillId, sk.activeAction)
          const toolBonus  = getToolBonus(state.equipment, skillId)
          durMs            = actionDef ? getActionDurationMs(actionDef, toolBonus) : 2000
          elapsed          = (now - sk.actionStartedAt) % durMs
          pct              = (elapsed / durMs) * 100
        }
      }

      if (barRef.current)  barRef.current.style.width = `${pct}%`
      if (timeRef.current && durMs > 0) {
        timeRef.current.textContent =
          `${(elapsed / 1000).toFixed(1)}s / ${(durMs / 1000).toFixed(0)}s`
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, skillId])  // re-subscribe only when active state changes

  if (!isActive) return null

  function handleStop() {
    if (isCraft) stopCraft()
    else stopAction(skillId)
  }

  return (
    <div
      className="rounded-sm px-3 py-2.5 space-y-2"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border:     '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Row 1 — icon + action name */}
      <div className="flex items-center gap-2">
        {actionIcon && (
          <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{actionIcon}</span>
        )}
        <span
          className="font-cinzel flex-1 truncate"
          style={{ fontSize: '0.5rem', color: 'var(--text-primary)' }}
        >
          {actionName}
        </span>
      </div>

      {/* Row 2 — progress bar + time */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 h-2"
          style={{
            background: 'rgba(0,0,0,0.5)',
            border:     '1px solid var(--border-default)',
            boxShadow:  'inset 0 1px 3px rgba(0,0,0,0.7)',
          }}
        >
          <div
            ref={barRef}
            className="h-full bg-amber-500"
            style={{ width: '0%', transition: 'width 0.1s linear' }}
          />
        </div>
        <span
          ref={timeRef}
          className="font-mono flex-shrink-0"
          style={{ fontSize: '0.42rem', color: 'var(--text-muted)', minWidth: '4rem', textAlign: 'right' }}
        />
      </div>

      {/* Row 3 — completed count + stop button */}
      <div className="flex items-center justify-between">
        <span
          className="font-cinzel"
          style={{ fontSize: '0.42rem', color: 'var(--text-muted)' }}
        >
          {completedCount !== null && completedCount > 0 && `×${completedCount} complétés`}
        </span>
        <button
          onClick={handleStop}
          className="font-cinzel px-2 py-0.5 rounded-sm"
          style={{
            fontSize:   '0.42rem',
            background: 'rgba(239,68,68,0.1)',
            border:     '1px solid rgba(239,68,68,0.3)',
            color:      'rgba(239,68,68,0.9)',
          }}
        >
          Arrêter
        </button>
      </div>
    </div>
  )
}
