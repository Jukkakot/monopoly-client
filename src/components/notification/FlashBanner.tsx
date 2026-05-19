import { useEffect, useState, useRef } from 'react'
import { useGame } from '../../store/GameContext'
import type { GameEvent } from '../../store/events'
import styles from './FlashBanner.module.css'

interface BannerItem {
  event: GameEvent
  visible: boolean
}

export default function FlashBanner() {
  const { state } = useGame()
  const [banners, setBanners] = useState<BannerItem[]>([])
  const seenIds = useRef(new Set<number>())

  useEffect(() => {
    if (!state.myPlayerId || state.events.length === 0) return

    const newEvents = state.events.filter(e =>
      !seenIds.current.has(e.id) &&
      e.relatedPlayerIds.includes(state.myPlayerId!)
    )

    if (newEvents.length === 0) return

    for (const e of newEvents) seenIds.current.add(e.id)

    setBanners(prev => [
      ...prev,
      ...newEvents.map(e => ({ event: e, visible: true })),
    ])
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
  if (visible.length === 0) return null

  return (
    <div className={styles.container}>
      {visible.map(b => (
        <div key={b.event.id} className={styles.banner}>
          <span className={styles.icon}>{b.event.icon}</span>
          <span className={styles.message}>{b.event.message}</span>
        </div>
      ))}
    </div>
  )
}
