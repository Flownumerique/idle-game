'use client'

import { useEffect, useRef, useState } from 'react'
import { bus } from '@/engine/event-bus'

interface RewardNotif {
  id: number
  text: string
  icon: string
}

let _nextId = 0

function getItemInfo(itemId: string): { name: string; icon: string } {
  try {
    // Dynamic import would be ideal but data-loader is sync
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GameData } = require('@/engine/data-loader') as typeof import('@/engine/data-loader')
    const item = GameData.item(itemId)
    return { name: item.name ?? itemId, icon: item.icon ?? '' }
  } catch {
    return { name: itemId, icon: '' }
  }
}

export default function FloatingReward() {
  const [notifs, setNotifs] = useState<RewardNotif[]>([])
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  function addNotif(text: string, icon: string) {
    const id = _nextId++
    setNotifs(prev => [...prev, { id, text, icon }])
    const t = setTimeout(() => {
      setNotifs(prev => prev.filter(n => n.id !== id))
      timeoutsRef.current.delete(id)
    }, 1600)
    timeoutsRef.current.set(id, t)
  }

  useEffect(() => {
    const unsub1 = bus.on('SKILL_ACTION_DONE', ({ outputs }) => {
      for (const { itemId, qty } of outputs) {
        const { name, icon } = getItemInfo(itemId)
        addNotif(`+${qty} ${name}`, icon)
      }
    })

    const unsub2 = bus.on('CRAFT_COMPLETED', ({ output }) => {
      if (!output.itemId) return
      const { name, icon } = getItemInfo(output.itemId)
      addNotif(`+${output.qty} ${name}`, icon)
    })

    return () => {
      unsub1()
      unsub2()
      timeoutsRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  if (notifs.length === 0) return null

  return (
    <div
      className="fixed bottom-20 left-1/2 flex flex-col items-center gap-1"
      style={{ transform: 'translateX(-50%)', zIndex: 9999, pointerEvents: 'none' }}
    >
      {notifs.map(n => (
        <div
          key={n.id}
          className="floating-reward flex items-center gap-1 px-3 py-1 rounded-sm"
          style={{
            background: 'rgba(0,0,0,0.75)',
            border: '1px solid rgba(201,146,42,0.4)',
            color: 'var(--gold-light)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-cinzel)',
            whiteSpace: 'nowrap',
          }}
        >
          {n.icon && <span style={{ fontSize: '0.85rem' }}>{n.icon}</span>}
          <span>{n.text}</span>
        </div>
      ))}
    </div>
  )
}
