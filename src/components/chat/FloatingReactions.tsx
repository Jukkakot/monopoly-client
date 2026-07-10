import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './FloatingReactions.module.css'
import { useGame } from '../../store/GameContext'

interface Floater {
  key: number
  emoji: string
  name: string
  color: string
  x: number  // px, viewport coords — horizontal centre of the float
  y: number  // px, viewport coords — where it starts rising from
  anchored: boolean  // true when pinned to the sender's on-screen chip
}

/** Looks up the sender's cash-chip on screen so a reaction rises out of the player's own
 *  name/money chip — you can see who reacted. Falls back to a spread-out lower-screen spot
 *  when the chip isn't visible (e.g. the reactor is on a different tab). */
function anchorFor(playerId: string): { x: number; y: number; anchored: boolean } {
  const el = typeof document !== 'undefined'
    ? document.querySelector(`[data-player-chip="${CSS.escape(playerId)}"]`)
    : null
  if (el) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2, y: r.top, anchored: true }
    }
  }
  const w = typeof window !== 'undefined' ? window.innerWidth : 360
  const h = typeof window !== 'undefined' ? window.innerHeight : 640
  return { x: w * (0.12 + Math.random() * 0.4), y: h * 0.72, anchored: false }
}

/** Floats emoji reactions up over the game view whenever any player reacts — so everyone
 *  sees a reaction the moment it's sent. Driven by the SSE event log (REACTION chat events);
 *  historical events (loaded on reconnect) are skipped so a refresh doesn't replay old ones. */
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
    const added = fresh.map(e => {
      const a = anchorFor(e.chat!.playerId)
      return {
        key: keyRef.current++,
        emoji: e.chat!.content,
        name: e.chat!.name,
        color: seatColor.get(e.chat!.playerId) ?? '#888',
        x: a.x, y: a.y, anchored: a.anchored,
      }
    })
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
        <div key={f.key} className={styles.floater} style={{ left: f.x, top: f.y }}>
          <span className={styles.emoji}>{f.emoji}</span>
          <span className={styles.name} style={{ color: f.color }}>{f.name}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}
