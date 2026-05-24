import { useEffect, useState, useRef } from 'react'
import { useGame } from '../../store/GameContext'
import type { GameEvent } from '../../store/events'
import styles from './FlashBanner.module.css'
import { useT } from '../../i18n/LanguageContext'
import { useIsAnimating } from '../../hooks/useTokenAnimation'

interface BannerItem {
  event: GameEvent
  visible: boolean
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

  // Detect when it becomes my turn — defer banner until animation finishes
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
  }, [state.snapshot?.turn?.activePlayerId, state.snapshot?.status, state.myPlayerId, state.sessionId, t.yourTurnMsg])

  // Fire the "your turn" banner once animation stops
  useEffect(() => {
    if (!animating && pendingMyTurn.current) {
      const { playerId, msg } = pendingMyTurn.current
      pendingMyTurn.current = null
      const syntheticEvent: GameEvent = {
        id: _localId--,
        timestamp: Date.now(),
        icon: '⭐',
        message: msg,
        relatedPlayerIds: [playerId],
      }
      setBanners(prev => [...prev, { event: syntheticEvent, visible: true }])
    }
  }, [animating])

  useEffect(() => {
    if (!state.myPlayerId || state.events.length === 0) return

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    // On mobile: skip card-drawn (shown in action panel), bought-property (user-initiated), trade-declined (minor)
    const NOTIFY_ICONS = isTouchDevice
      ? new Set(['🎊', '⛓', '🔓', '💀', '🔨', '🤝', '💰', '💸', '🏆'])
      : new Set(['🎊', '🃏', '⛓', '🔓', '💀', '🔨', '🤝', '🚫', '🏠', '💰', '💸', '🏆'])
    const newEvents = state.events.filter(e =>
      !seenIds.current.has(e.id) &&
      !e.historical &&
      NOTIFY_ICONS.has(e.icon) &&
      (e.relatedPlayerIds.length === 0 || e.relatedPlayerIds.includes(state.myPlayerId!))
    )

    if (newEvents.length === 0) return

    // Mark all as seen immediately to avoid double-processing
    for (const e of newEvents) seenIds.current.add(e.id)

    const now = Date.now()
    const immediate = newEvents.filter(e => !e.releaseAt || e.releaseAt <= now)
    const delayed = newEvents.filter(e => e.releaseAt && e.releaseAt > now)

    if (immediate.length > 0) {
      setBanners(prev => [...prev, ...immediate.map(e => ({ event: e, visible: true }))])
    }
    for (const e of delayed) {
      setTimeout(() => {
        setBanners(prev => [...prev, { event: e, visible: true }])
      }, e.releaseAt! - now)
    }
  }, [state.events, state.myPlayerId])

  // Auto-dismiss banners after 3s
  useEffect(() => {
    if (banners.length === 0) return
    const timers = banners
      .filter(b => b.visible)
      .map(b =>
        setTimeout(() => {
          setBanners(prev =>
            prev.map(p => p.event.id === b.event.id ? { ...p, visible: false } : p)
          )
        }, 3000)
      )
    // Cleanup stale (invisible) banners after animation
    const cleanup = setTimeout(() => {
      setBanners(prev => prev.filter(p => p.visible))
    }, 3600)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(cleanup)
    }
  }, [banners.length])

  const visible = banners.filter(b => b.visible)
  const hasContent = visible.length > 0 || !!state.commandError || state.connectionStatus === 'RECONNECTING'

  if (!hasContent) return null

  return (
    <div className={styles.container}>
      {state.connectionStatus === 'RECONNECTING' && (
        <div className={`${styles.banner} ${styles.reconnecting}`}>
          <span className={styles.icon}>📡</span>
          <span className={styles.message}>{t.reconnectingMsg}</span>
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
