'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/game-store'
import { getMonstersInZone } from '@/engine/combat-engine'
import {
  evaluateZoneLock,
  getEffectiveLock,
  getZoneLockProgress,
  computeCombatLevel,
} from '@/engine/zone-lock'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import { RARITY_COLOR } from '@/lib/rarity'
import type { ZoneDef, ZoneLock, ZoneLockProgress } from '@/types/zone'

// ──────────────────────────────────────────────
// Lock visual config
// ──────────────────────────────────────────────

type LockType = ZoneLock['type']

const LOCK_STYLE: Record<LockType, { color: string; bg: string; border: string }> = {
  none:       { color: 'var(--color-heal)',   bg: 'rgba(61,214,140,0.08)',   border: 'rgba(61,214,140,0.25)'   },
  level:      { color: '#60a5fa',             bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.3)'    },
  craft:      { color: '#fb923c',             bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.3)'    },
  boss_kill:  { color: '#f87171',             bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.3)'   },
  item_found: { color: '#c084fc',             bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.3)'   },
  AND:        { color: '#94a3b8',             bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.25)'  },
}

const LOCK_ICON: Record<LockType, string> = {
  none:       '✓',
  level:      '🔒',
  craft:      '🔒',
  boss_kill:  '💀',
  item_found: '❓',
  AND:        '🔒',
}

const LOCK_CONDITION_ICON: Record<string, string> = {
  '🔵': '🔵',
  '🟠': '🟠',
  '💀': '💀',
  '❓': '❓',
}

const BOSS_KILL_REQUIREMENT = 10

// ──────────────────────────────────────────────
// Lock condition row
// ──────────────────────────────────────────────

function ConditionRow({ p }: { p: ZoneLockProgress }) {
  const style = p.met
    ? { color: 'var(--color-heal)', borderColor: 'rgba(61,214,140,0.2)', bg: 'rgba(61,214,140,0.04)' }
    : { color: 'var(--color-damage)', borderColor: 'rgba(224,80,80,0.2)', bg: 'rgba(224,80,80,0.04)' }

  return (
    <div
      className="rounded-sm px-2.5 py-1.5 flex items-start gap-2"
      style={{ background: style.bg, border: `1px solid ${style.borderColor}` }}
    >
      <span className="text-sm leading-none mt-0.5 flex-shrink-0">{p.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-crimson text-xs leading-snug" style={{ color: p.met ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {p.label}
          </span>
          {p.required > 1 ? (
            <span className="font-mono flex-shrink-0" style={{ fontSize: '0.65rem', color: style.color }}>
              {p.current}/{p.required}
            </span>
          ) : (
            <span className="flex-shrink-0" style={{ fontSize: '0.7rem', color: style.color }}>
              {p.met ? '✓' : '✗'}
            </span>
          )}
        </div>
        {p.required > 1 && (
          <div className="mt-1">
            <ProgressBar
              value={Math.min(1, p.current / p.required)}
              height="h-1"
              color={p.met ? 'bg-green-500' : 'bg-slate-600'}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// ZoneCard
// ──────────────────────────────────────────────

export interface ZoneCardProps {
  zone:        ZoneDef
  onEnter:     () => void
  onBossFight: () => void
}

export default function ZoneCard({ zone, onEnter, onBossFight }: ZoneCardProps) {
  const [expanded, setExpanded] = useState(false)

  const state      = useGameStore(s => s)
  const zoneKills  = useGameStore(s => s.zoneKills)

  const lock        = getEffectiveLock(zone)
  const isOpen      = evaluateZoneLock(lock, state)
  const progress    = getZoneLockProgress(lock, state)
  const combatLevel = computeCombatLevel(state)

  const monsters = getMonstersInZone(zone.id)
  const regulars = monsters.filter(m => !m.isBoss)
  const boss     = monsters.find(m  => m.isBoss)
  const kills    = zoneKills[zone.id] ?? 0
  const bossReady = kills >= BOSS_KILL_REQUIREMENT

  const lockStyle = LOCK_STYLE[lock.type]
  const lockIcon  = isOpen ? '✓' : LOCK_ICON[lock.type]

  // Summary label for collapsed header (first unmet condition)
  const firstUnmet = progress.find(p => !p.met)
  const lockedLabel = firstUnmet?.label ?? 'Verrou actif'

  return (
    <div
      className="rounded-sm overflow-hidden transition-all"
      style={{
        border: `1px solid ${isOpen ? 'var(--border-subtle)' : lockStyle.border}`,
        opacity: isOpen ? 1 : 0.9,
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <button
        className="w-full text-left p-3 flex items-center gap-3 transition-colors"
        style={{ background: expanded ? 'var(--surface-elevated)' : 'var(--surface-card)' }}
        onClick={() => setExpanded(e => !e)}
      >
        <span className="pixel-icon flex-shrink-0">{zone.icon ?? '🌍'}</span>

        <div className="flex-1 min-w-0">
          {/* Zone name + boss badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="font-cinzel text-xs tracking-wide"
              style={{ color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {zone.name}
            </span>
            {boss && (
              <span
                className="font-cinzel tracking-widest uppercase px-1 py-px rounded-sm"
                style={{ fontSize: '0.5rem', color: 'var(--gold-light)', background: 'rgba(201,146,42,0.1)', border: '1px solid rgba(201,146,42,0.3)' }}
              >
                Boss
              </span>
            )}
          </div>

          {/* Subtitle: monster icons (open) or first lock hint (locked) */}
          <div className="flex items-center gap-1 mt-1">
            {isOpen ? (
              <>
                {regulars.slice(0, 4).map(m => (
                  <span key={m.def.id} className="text-sm leading-none" title={m.def.name}>{m.def.icon ?? '👾'}</span>
                ))}
                {boss && (
                  <span className="text-sm leading-none ml-0.5" title={boss.def.name} style={{ color: 'var(--gold-light)' }}>
                    {boss.def.icon ?? '👑'}
                  </span>
                )}
              </>
            ) : (
              <span className="font-crimson text-xs" style={{ color: lockStyle.color }}>
                {LOCK_ICON[lock.type]} {lockedLabel}
              </span>
            )}
          </div>
        </div>

        {/* Right badge */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isOpen ? (
            <>
              <span
                className="font-cinzel tracking-widest uppercase px-2 py-0.5 rounded-sm"
                style={{ fontSize: '0.5rem', color: 'var(--color-heal)', background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.2)' }}
              >
                ✓ Accessible
              </span>
              <div className="flex gap-1">
                <span
                  className="font-cinzel tracking-widest px-1.5 rounded-sm"
                  style={{ fontSize: '0.5rem', color: 'var(--color-xp)', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}
                >
                  ×{zone.combatXpMultiplier ?? 1} XP
                </span>
                <span
                  className="font-cinzel tracking-widest px-1.5 rounded-sm"
                  style={{ fontSize: '0.5rem', color: 'var(--gold-light)', background: 'rgba(201,146,42,0.08)', border: '1px solid rgba(201,146,42,0.15)' }}
                >
                  ×{zone.goldMultiplier ?? 1} 🪙
                </span>
              </div>
            </>
          ) : (
            <span
              className="font-cinzel tracking-widest uppercase px-2 py-0.5 rounded-sm"
              style={{ fontSize: '0.5rem', color: lockStyle.color, background: lockStyle.bg, border: `1px solid ${lockStyle.border}` }}
            >
              {lockIcon} Verrouillé
            </span>
          )}
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────────────────── */}
      {expanded && (
        <div
          className="p-3 space-y-3"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.3)' }}
        >
          {/* Lore */}
          {zone.lore && (
            <p
              className="font-crimson italic text-xs leading-relaxed pl-3"
              style={{ color: 'var(--text-muted)', borderLeft: '2px solid var(--border-gold)' }}
            >
              &ldquo;{zone.lore}&rdquo;
            </p>
          )}

          {/* ── Locked: show all conditions with progress ── */}
          {!isOpen && progress.length > 0 && (
            <div>
              <div
                className="font-cinzel tracking-widest uppercase mb-1.5"
                style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}
              >
                Conditions d&apos;accès
              </div>
              <div className="space-y-1.5">
                {progress.map((p, i) => <ConditionRow key={i} p={p} />)}
              </div>
            </div>
          )}

          {/* ── Open: monster list + boss + enter button ── */}
          {isOpen && (
            <>
              {/* Regulars grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {regulars.map(m => (
                  <div
                    key={m.def.id}
                    className="flex items-center gap-2 p-2 rounded-sm"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      color: RARITY_COLOR[m.def.rarity ?? 'common'] ?? 'var(--text-secondary)',
                    }}
                  >
                    <span className="pixel-icon-sm flex-shrink-0">{m.def.icon ?? '👾'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-crimson font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {m.def.name}
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        ❤️{m.def.stats.hp} ⚔️{m.def.stats.attack}
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                        ~{Math.round(100 / regulars.length)}% rencontre
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Boss section */}
              {boss && (
                <div className="space-y-2">
                  <div
                    className="rounded-sm p-2.5"
                    style={{
                      border: bossReady ? '1px solid rgba(201,146,42,0.4)' : '1px solid var(--border-subtle)',
                      background: bossReady ? 'rgba(201,146,42,0.06)' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="pixel-icon flex-shrink-0">{boss.def.icon ?? '👑'}</span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-cinzel text-xs font-bold tracking-wide"
                          style={{ color: bossReady ? 'var(--gold-light)' : 'var(--text-secondary)' }}
                        >
                          {boss.def.name}
                        </div>
                        <div className="font-mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                          ❤️{boss.def.stats.hp} ⚔️{boss.def.stats.attack} 🛡️{boss.def.stats.defense}
                        </div>
                      </div>
                      {bossReady && (
                        <span
                          className="font-cinzel tracking-widest uppercase px-1.5 py-0.5 rounded-sm"
                          style={{ fontSize: '0.5rem', color: 'var(--gold-light)', background: 'rgba(201,146,42,0.15)', border: '1px solid rgba(201,146,42,0.4)' }}
                        >
                          Disponible
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between mb-1" style={{ fontSize: '0.6rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monstres vaincus</span>
                      <span className="font-mono" style={{ color: bossReady ? 'var(--gold-light)' : 'var(--text-secondary)' }}>
                        {Math.min(kills, BOSS_KILL_REQUIREMENT)}/{BOSS_KILL_REQUIREMENT}
                      </span>
                    </div>
                    <ProgressBar
                      value={Math.min(1, kills / BOSS_KILL_REQUIREMENT)}
                      height="h-1"
                      color={bossReady ? 'bg-amber-500' : 'bg-slate-600'}
                    />
                  </div>
                  {bossReady && (
                    <Button variant="danger" className="w-full" onClick={onBossFight}>
                      ⚠️ Défier {boss.def.name}
                    </Button>
                  )}
                </div>
              )}

              <Button className="w-full" onClick={onEnter}>
                ⚔️ Explorer
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
