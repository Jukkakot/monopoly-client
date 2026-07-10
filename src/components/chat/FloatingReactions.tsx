import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './FloatingReactions.module.css'
import { useGame } from '../../store/GameContext'

interface Floater {
  key: number
  emoji: string
  name: string
  color: string
  left: number  // vw offset for horizontal jitter
}

/** Floats emoji reactions up over the game view whenever any player reacts — so everyone
 *  sees a reaction the moment it's sent, not just readers of the Chat tab. Driven by the
 *  same SSE event log (REACTION chat events); historical events (loaded on reconnect) are
 *  skipped so a refresh doesn't replay a burst of old reactions. */
export default function FloatingReactions() {
  const { state } = useGame()
  const [floaters, setFloaters] = useState<Floater[]>([])
  const lastSeenId = useRef<number>(-1)
  const keyRef = useRef(0)
  const seededRef = useRef(false)

  useEffect(() => {
    // On first run, mark all existing reactions as seen so a page load doesn't replay them.
    if (!seededRef.current) {
      seededRef.current = true
      const ids = state.events.filter(e => e.chat?.kind === 'REACTION').map(e => e.id)
      lastSeenId.current = ids.length ? Math.max(...ids) : -1
      return
    }
    const fresh = state.events.filter(
      e => e.chat?.kind === 'REACTION' && !e.historical && e.id > lastSeenId.current,
    )
    if (fresh.length === 0) return
    lastSeenId.current = Math.max(lastSeenId.current, ...fresh.map(e => e.id))

    const seatColor = new Map((state.snapshot?.seats ?? []).map(s => [s.playerId, s.tokenColorHex]))
    const added = fresh.map(e => ({
      key: keyRef.current++,
      emoji: e.chat!.content,
      name: e.chat!.name,
      color: seatColor.get(e.chat!.playerId) ?? '#888',
      left: 8 + Math.random() * 40,  // spread across the lower-left region
    }))
    setFloaters(f => [...f, ...added])
    // Remove each floater after its animation completes.
    for (const a of added) {
      setTimeout(() => setFloaters(f => f.filter(x => x.key !== a.key)), 2600)
    }
  }, [state.events, state.snapshot?.seats])

  if (floaters.length === 0) return null

  return createPortal(
    <div className={styles.layer} aria-hidden="true">
      {floaters.map(f => (
        <div key={f.key} className={styles.floater} style={{ left: `${f.left}%` }}>
          <span className={styles.emoji}>{f.emoji}</span>
          <span className={styles.name} style={{ color: f.color }}>{f.name}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}
