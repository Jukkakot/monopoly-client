import styles from './AppLayout.module.css'
import { useState, useRef, type ReactNode } from 'react'

type MobileTab = 'board' | 'players' | 'log' | 'actions'

const MOBILE_TABS: MobileTab[] = ['board', 'players', 'log', 'actions']
const MOBILE_LABELS: Record<MobileTab, string> = {
  board: '🎲 Lauta',
  players: '👥 Pelaajat',
  log: '📋 Loki',
  actions: '⚡ Toiminnot',
}

interface Props {
  header: ReactNode
  board: ReactNode
  players: ReactNode
  log: ReactNode
  actions: ReactNode
}

export default function AppLayout({ header, board, players, log, actions }: Props) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('board')

  const touchStartX = useRef(0)
  const tabIdx = MOBILE_TABS.indexOf(mobileTab)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) < 50) return
    if (dx < 0 && tabIdx < MOBILE_TABS.length - 1) setMobileTab(MOBILE_TABS[tabIdx + 1])
    if (dx > 0 && tabIdx > 0) setMobileTab(MOBILE_TABS[tabIdx - 1])
  }

  return (
    <div className={styles.root} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* ── Desktop: board column ── */}
      <div className={styles.boardCol}>
        {board}
      </div>

      {/* ── Desktop: sidebar ── */}
      <div className={styles.sideCol}>
        {header}
        <div className={styles.sideSection}>{players}</div>
        <div className={styles.sideDivider} />
        <div className={styles.sideSection}>{log}</div>
        <div className={styles.actions}>{actions}</div>
      </div>

      {/* ── Mobile: content area (above bottom nav) ── */}
      <div className={styles.mobileContent}>
        <div className={mobileTab === 'board' ? styles.mobileBoard : styles.mobileBoardHidden}>
          {board}
        </div>
        {mobileTab !== 'board' && (
          <div className={styles.mobileBoardCompact}>
            {board}
          </div>
        )}
        <div className={styles.mobileSection}>
          {(mobileTab === 'board' || mobileTab === 'actions') && <div className={styles.mobilePadded}>{actions}</div>}
          {mobileTab === 'players' && players}
          {mobileTab === 'log' && log}
        </div>
      </div>

      {/* ── Mobile: bottom nav ── */}
      <nav className={styles.mobileNav}>
        {MOBILE_TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.navBtn} ${mobileTab === tab ? styles.navActive : ''}`}
            onClick={() => setMobileTab(tab)}
          >
            {MOBILE_LABELS[tab]}
          </button>
        ))}
      </nav>
    </div>
  )
}
