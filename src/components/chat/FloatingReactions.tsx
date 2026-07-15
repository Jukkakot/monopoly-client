import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
  dir: 'up' | 'down'  // which way it floats away from the token
  scale: number       // sized relative to the board so it grows with the board
}

// A message lingers far longer than an emoji so it can actually be read.
const REACTION_MS = 2600
const MESSAGE_MS = 6000

/** Anchors a float to the sender's token on the board so it visibly pops out of their piece.
 *  It floats *down* when the token sits in the board's top half and *up* when it's in the bottom
 *  half, so the bubble always heads into open space rather than off-screen. Size scales with the
 *  board. Falls back to the mobile cash-chip, then a spread-out spot, when no token is on screen. */
function anchorFor(playerId: string, kind: 'reaction' | 'message'): { x: number; y: number; dir: 'up' | 'down'; scale: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 360
  const h = typeof window !== 'undefined' ? window.innerHeight : 640
  const doc = typeof document !== 'undefined' ? document : null
  // Grow floats with the board. Use the board's LAYOUT width (clientWidth) — its bounding rect is
  // unreliable because the board carries a zoom transform. Bigger board → bigger bubbles.
  const boardEl = doc?.querySelector('[data-board]') as HTMLElement | null
  const scale = boardEl && boardEl.clientWidth > 0 ? Math.max(1, Math.min(2, boardEl.clientWidth / 560)) : 1
  // A message bubble is wider than an emoji; keep the centred float clear of the viewport edges.
  const margin = (kind === 'message' ? 120 : 30) * scale
  const clampX = (x: number) => Math.max(margin, Math.min(w - margin, x))
  // Float down when the token is in the top half of the screen, up when in the bottom half, so the
  // bubble always heads into open space. (Viewport-relative — robust to the board's zoom/pan.)
  const from = (r: DOMRect) => {
    const dir: 'up' | 'down' = r.top + r.height / 2 < h / 2 ? 'down' : 'up'
    return { x: clampX(r.left + r.width / 2), y: dir === 'up' ? r.top : r.bottom, dir, scale }
  }

  const token = doc?.querySelector(`[data-player-token="${CSS.escape(playerId)}"]`)
  if (token) { const r = token.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return from(r) }
  const chip = doc?.querySelector(`[data-player-chip="${CSS.escape(playerId)}"]`)
  if (chip) { const r = chip.getBoundingClientRect(); if (r.width > 0 && r.height > 0) return from(r) }

  const y = h * (kind === 'message' ? 0.4 : 0.5)
  return { x: clampX(w * (0.12 + Math.random() * 0.4)), y, dir: y < h / 2 ? 'down' : 'up', scale }
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
      const ids = state.chatEvents.map(e => e.id)
      lastSeenId.current = ids.length ? Math.max(...ids) : -1
      return
    }
    const fresh = state.chatEvents.filter(e => e.chat && !e.historical && e.id > lastSeenId.current)
    if (fresh.length === 0) return
    lastSeenId.current = Math.max(lastSeenId.current, ...fresh.map(e => e.id))

    // On the Chat tab the list already shows everything, so don't float anything (messages or
    // reactions) over it. lastSeenId is already advanced, so nothing replays on leaving the tab.
    const chatTabOpen = typeof document !== 'undefined' && document.body.dataset.chatTabOpen === '1'
    if (chatTabOpen) return
    const seatColor = new Map((state.snapshot?.seats ?? []).map(s => [s.playerId, s.tokenColorHex]))
    const nameOf = new Map((state.snapshot?.players ?? []).map(p => [p.playerId, p.name]))
    const added = fresh
      // A reaction attached to a message (replyToId) belongs under that bubble, not floating.
      .filter(e => !(e.chat!.kind === 'REACTION' && e.chat!.replyToId != null))
      .map(e => {
      const chat = e.chat!
      const kind = chat.kind === 'REACTION' ? 'reaction' : 'message'
      const a = anchorFor(chat.playerId, kind)
      // A directed bot line floats with its @mention prefix so it reads the same as in the list.
      const mention = chat.targetPlayerId ? `@${nameOf.get(chat.targetPlayerId) ?? ''} ` : ''
      return {
        key: keyRef.current++,
        kind,
        emoji: kind === 'reaction' ? chat.content : undefined,
        text: kind === 'message' ? mention + resolveChatText(chat, t.botChat, e.id) : undefined,
        name: chat.name,
        color: seatColor.get(chat.playerId) ?? '#888',
        x: a.x, y: a.y, dir: a.dir, scale: a.scale,
      } as Floater
    })
    if (added.length === 0) return
    // Cap concurrent floaters so a burst can't clutter the board; keep the most recent.
    setFloaters(f => [...f, ...added].slice(-6))
    for (const item of added) {
      const ttl = item.kind === 'message' ? MESSAGE_MS : REACTION_MS
      setTimeout(() => setFloaters(f => f.filter(x => x.key !== item.key)), ttl)
    }
  }, [state.chatEvents, state.snapshot?.seats, state.snapshot?.players, t])

  if (floaters.length === 0) return null

  return createPortal(
    <div className={styles.layer} aria-hidden="true">
      {floaters.map(f => f.kind === 'reaction' ? (
        <div key={f.key} className={`${styles.floater} ${f.dir === 'up' ? styles.up : styles.down}`}
          style={{ left: f.x, top: f.y, '--s': f.scale } as CSSProperties}>
          <span className={styles.emoji}>{f.emoji}</span>
          <span className={styles.name} style={{ color: f.color }}>{f.name}</span>
        </div>
      ) : (
        <div key={f.key} className={`${styles.msgFloater} ${f.dir === 'up' ? styles.up : styles.down}`}
          style={{ left: f.x, top: f.y, '--s': f.scale } as CSSProperties}>
          <span className={styles.msgName} style={{ color: f.color }}>{f.name}</span>
          <span className={styles.msgText}>{f.text}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}
