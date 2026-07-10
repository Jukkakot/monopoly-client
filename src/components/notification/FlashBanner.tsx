import { useEffect, useState, useRef } from 'react'
import { useGame } from '../../store/GameContext'
import type { GameEvent } from '../../store/events'
import styles from './FlashBanner.module.css'
import { useT } from '../../i18n/LanguageContext'
import { useIsAnimating } from '../../hooks/useTokenAnimation'
import { loadNotifConfig, notifIconsFromConfig } from '../menu/SoundSettings'

interface BannerItem {
  event: GameEvent
  visible: boolean
  shownAt: number
}

let _localId = -1

export default function FlashBanner() {
  const { state } = useGame()
  const t = useT()
  const animating = useIsAnimating()
  const [banners, setBanners] = useState<BannerItem[]>([])
  const seenIds = useRef(new Set<number>())
  const prevActiveId = useRef<string | null>(null)
  const pendingMyTurn = useRef<{ playerId: string; msg: string } | null>(null)

  // Detect when it becomes my turn and fire the banner as soon as no animation is
  // running. A single effect covering both signals: the old animation-only effect never
  // re-ran when the turn changed WITHOUT token movement (previous player just ended
  // their turn), leaving the banner queued until some later animation finished — it
  // then popped up mid-way through someone else's roll.
  useEffect(() => {
    const activeId = state.snapshot?.turn?.activePlayerId ?? null
    const gameOver = state.snapshot?.status === 'GAME_OVER'
    // Only show in real-player mode (personal token stored), not in solo/dynamic mode
    const isRealPlayer = !!(state.sessionId && sessionStorage.getItem(`monopoly_token_${state.sessionId}`))
    if (
      isRealPlayer &&
      !gameOver &&
      activeId &&
      activeId === state.myPlayerId &&
      prevActiveId.current !== null &&
      prevActiveId.current !== activeId
    ) {
      pendingMyTurn.current = { playerId: activeId, msg: t.yourTurnMsg }
    }
    prevActiveId.current = activeId

    if (!animating && pendingMyTurn.current) {
      const { playerId, msg } = pendingMyTurn.current
      pendingMyTurn.current = null
      if (!loadNotifConfig().yourTurn) return
      const syntheticEvent: GameEvent = {
        id: _localId--,
        timestamp: Date.now(),
        icon: '⭐',
        message: msg,
        relatedPlayerIds: [playerId],
      }
      setBanners(prev => [...prev, { event: syntheticEvent, visible: true, shownAt: Date.now() }])
    }
  }, [state.snapshot?.turn?.activePlayerId, state.snapshot?.status, state.myPlayerId, state.sessionId, t.yourTurnMsg, animating])

  useEffect(() => {
    if (!state.myPlayerId || state.events.length === 0) return

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    const NOTIFY_ICONS = notifIconsFromConfig(loadNotifConfig(), isTouchDevice)
    const newEvents = state.events.filter(e => {
      if (seenIds.current.has(e.id)) return false
      // Always register historical event IDs so they can't fire if flag is later lost
      if (e.historical) { seenIds.current.add(e.id); return false }
      return NOTIFY_ICONS.has(e.icon) &&
        (e.relatedPlayerIds.length === 0 || e.relatedPlayerIds.includes(state.myPlayerId!))
    })

    if (newEvents.length === 0) return

    // Mark all as seen immediately to avoid double-processing
    for (const e of newEvents) seenIds.current.add(e.id)

    const now = Date.now()
    const immediate = newEvents.filter(e => !e.releaseAt || e.releaseAt <= now)
    const delayed = newEvents.filter(e => e.releaseAt && e.releaseAt > now)

    if (immediate.length > 0) {
      setBanners(prev => [...prev, ...immediate.map(e => ({ event: e, visible: true, shownAt: Date.now() }))])
    }
    for (const e of delayed) {
      setTimeout(() => {
        setBanners(prev => [...prev, { event: e, visible: true, shownAt: Date.now() }])
      }, e.releaseAt! - now)
    }
  }, [state.events, state.myPlayerId])

  // Auto-dismiss banners 3s after each one was shown. Driven by per-banner shownAt
  // timestamps and a single ticker — the old per-effect timers restarted the full 3s
  // whenever a NEW banner arrived, so in a busy game banners piled up far past their
  // intended lifetime.
  const hasBanners = banners.length > 0
  useEffect(() => {
    if (!hasBanners) return
    const tick = setInterval(() => {
      const now = Date.now()
      setBanners(prev => {
        let changed = false
        const next: BannerItem[] = []
        for (const b of prev) {
          if (now - b.shownAt >= 3600) { changed = true; continue }          // remove after fade-out
          if (b.visible && now - b.shownAt >= 3000) {
            changed = true
            next.push({ ...b, visible: false })                              // start fade-out
          } else {
            next.push(b)
          }
        }
        return changed ? next : prev
      })
    }, 200)
    return () => clearInterval(tick)
  }, [hasBanners])

  const visible = banners.filter(b => b.visible)
  // Only warn about weak links while actually connected — reconnecting/failed have their own UI.
  const weakConn = state.connectionStatus === 'LIVE' && state.connectionQuality !== 'good'
  const hasContent = visible.length > 0 || !!state.commandError
    || state.connectionStatus === 'RECONNECTING' || weakConn

  if (!hasContent) return null

  return (
    <div className={styles.container}>
      {state.connectionStatus === 'RECONNECTING' && (
        <div className={`${styles.banner} ${styles.reconnecting}`}>
          <span className={styles.icon}>📡</span>
          <span className={styles.message}>{t.reconnectingMsg}</span>
        </div>
      )}
      {weakConn && (
        <div className={`${styles.banner} ${styles.weakConn}`}>
          <span className={styles.icon}>{state.connectionQuality === 'unstable' ? '📶' : '🐢'}</span>
          <span className={styles.message}>
            {state.connectionQuality === 'unstable' ? t.connUnstableMsg : t.connSlowMsg}
          </span>
        </div>
      )}
      {state.commandError && (
        <div className={`${styles.banner} ${styles.error}`}>
          <span className={styles.icon}>⚠️</span>
          <span className={styles.message}>{state.commandError}</span>
        </div>
      )}
      {visible.map(b => {
        const isRentReceived = b.event.icon === '💸' && state.myPlayerId &&
          b.event.relatedPlayerIds.length >= 2 &&
          b.event.relatedPlayerIds[1] === state.myPlayerId
        return (
          <div key={b.event.id} className={`${styles.banner} ${b.event.icon === '⭐' ? styles.myTurn : ''} ${isRentReceived ? styles.rentReceived : ''}`}>
            <span className={styles.icon}>{b.event.icon}</span>
            <span className={styles.message}>{b.event.message}</span>
          </div>
        )
      })}
    </div>
  )
}
