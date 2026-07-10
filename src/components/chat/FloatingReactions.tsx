import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './FloatingReactions.module.css'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { resolveChatText } from '../../utils/chatText'

interface Floater {
  key: number
  kind: 'reaction' | 'message'
  emoji?: string   // reaction
  text?: string    // message
  name: string
  color: string
  x: number  // px, viewport coords — horizontal centre of the float
  y: number  // px, viewport coords — where it starts
}

// A message lingers far longer than an emoji so it can actually be read.
const REACTION_MS = 2600
const MESSAGE_MS = 6000

/** Looks up the sender's cash-chip on screen so a reaction/message rises out of the player's own
 *  name/money chip — you can see who it came from. Reactions fly up from the chip top; messages
 *  drift down from the chip bottom into the open board area where there's room to read them.
 *  Falls back to a spread-out spot when the chip isn't visible (e.g. the sender is on another tab). */
function anchorFor(playerId: string, kind: 'reaction' | 'message'): { x: number; y: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 360
  const h = typeof window !== 'undefined' ? window.innerHeight : 640
  // The float is centred on x (translateX(-50%)); keep it clear of the viewport edges. A message
  // bubble is up to ~240px wide, so it needs a bigger margin than a small emoji.
  const margin = kind === 'message' ? 128 : 30
  const clampX = (x: number) => Math.max(margin, Math.min(w - margin, x))

  const el = typeof document !== 'undefined'
    ? document.querySelector(`[data-player-chip="${CSS.escape(playerId)}"]`)
    : null
  if (el) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      return { x: clampX(r.left + r.width / 2), y: kind === 'message' ? r.bottom + 4 : r.top }
    }
  }
  return { x: clampX(w * (0.12 + Math.random() * 0.4)), y: h * (kind === 'message' ? 0.4 : 0.72) }
}

/** Floats emoji reactions and chat messages up/over the game view whenever any player reacts or
 *  talks — so everyone sees it the moment it's sent, without opening the Chat tab. Driven by the
 *  SSE event log; historical events (loaded on reconnect) are skipped so a refresh doesn't replay. */
export default function FloatingReactions() {
  const { state } = useGame()
  const t = useT()
  const [floaters, setFloaters] = useState<Floater[]>([])
  const lastSeenId = useRef<number>(-1)
  const keyRef = useRef(0)
  const seededRef = useRef(false)

  useEffect(() => {
    // On first run, mark all existing chat events as seen so a page load doesn't replay them.
    if (!seededRef.current) {
      seededRef.current = true
      const ids = state.events.filter(e => e.chat).map(e => e.id)
      lastSeenId.current = ids.length ? Math.max(...ids) : -1
      return
    }
    const fresh = state.events.filter(e => e.chat && !e.historical && e.id > lastSeenId.current)
    if (fresh.length === 0) return
    lastSeenId.current = Math.max(lastSeenId.current, ...fresh.map(e => e.id))

    const seatColor = new Map((state.snapshot?.seats ?? []).map(s => [s.playerId, s.tokenColorHex]))
    const added = fresh.map(e => {
      const chat = e.chat!
      const kind = chat.kind === 'REACTION' ? 'reaction' : 'message'
      const a = anchorFor(chat.playerId, kind)
      return {
        key: keyRef.current++,
        kind,
        emoji: kind === 'reaction' ? chat.content : undefined,
        text: kind === 'message' ? resolveChatText(chat, t.botChat) : undefined,
        name: chat.name,
        color: seatColor.get(chat.playerId) ?? '#888',
        x: a.x, y: a.y,
      } as Floater
    })
    // Cap concurrent floaters so a burst can't clutter the board; keep the most recent.
    setFloaters(f => [...f, ...added].slice(-6))
    for (const item of added) {
      const ttl = item.kind === 'message' ? MESSAGE_MS : REACTION_MS
      setTimeout(() => setFloaters(f => f.filter(x => x.key !== item.key)), ttl)
    }
  }, [state.events, state.snapshot?.seats, t])

  if (floaters.length === 0) return null

  return createPortal(
    <div className={styles.layer} aria-hidden="true">
      {floaters.map(f => f.kind === 'reaction' ? (
        <div key={f.key} className={styles.floater} style={{ left: f.x, top: f.y }}>
          <span className={styles.emoji}>{f.emoji}</span>
          <span className={styles.name} style={{ color: f.color }}>{f.name}</span>
        </div>
      ) : (
        <div key={f.key} className={styles.msgFloater} style={{ left: f.x, top: f.y }}>
          <span className={styles.msgName} style={{ color: f.color }}>{f.name}</span>
          <span className={styles.msgText}>{f.text}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}
