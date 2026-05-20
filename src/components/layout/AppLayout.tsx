import styles from './AppLayout.module.css'
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useGame } from '../../store/GameContext'

const SIDEBAR_MIN = 280
const SIDEBAR_MAX = 700
const SIDEBAR_DEFAULT = 380

function loadSidebarWidth(): number {
  try {
    const v = localStorage.getItem('monopoly_sidebar_width')
    if (v) { const n = parseInt(v); if (n >= SIDEBAR_MIN && n <= SIDEBAR_MAX) return n }
  } catch {}
  return SIDEBAR_DEFAULT
}

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
  actionAlert?: boolean
}

export default function AppLayout({ header, board, players, log, actions, actionAlert }: Props) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('board')
  const { state } = useGame()
  const [unreadLog, setUnreadLog] = useState(0)
  const lastSeenLogCount = useRef(state.events.length)
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth)
  const dragStartX = useRef<number | null>(null)
  const dragStartW = useRef<number>(sidebarWidth)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragStartX.current = e.clientX
    dragStartW.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth])

  const currentWidthRef = useRef(sidebarWidth)
  useEffect(() => { currentWidthRef.current = sidebarWidth }, [sidebarWidth])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragStartX.current === null) return
      const delta = dragStartX.current - e.clientX
      const newW = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartW.current + delta))
      setSidebarWidth(newW)
    }
    function onUp() {
      if (dragStartX.current === null) return
      dragStartX.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try { localStorage.setItem('monopoly_sidebar_width', String(currentWidthRef.current)) } catch {}
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  useEffect(() => {
    if (mobileTab === 'log') {
      lastSeenLogCount.current = state.events.length
      setUnreadLog(0)
    } else {
      const newCount = state.events.length - lastSeenLogCount.current
      if (newCount > 0) setUnreadLog(newCount)
    }
  }, [state.events.length, mobileTab])

  // Auto-switch to actions tab when it becomes my turn on mobile
  const prevActiveId = useRef<string | null>(null)
  useEffect(() => {
    const activeId = state.snapshot?.turn?.activePlayerId ?? null
    if (activeId && activeId === state.myPlayerId && prevActiveId.current !== activeId) {
      setMobileTab('actions')
    }
    prevActiveId.current = activeId
  }, [state.snapshot?.turn?.activePlayerId, state.myPlayerId])

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

      {/* ── Desktop: resize handle ── */}
      <div className={styles.resizeHandle} onMouseDown={onDragStart} title="Vedä muuttaaksesi leveyttä" />

      {/* ── Desktop: sidebar ── */}
      <div className={styles.sideCol} style={{ flexBasis: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}>
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
            {tab === 'actions' && actionAlert && mobileTab !== 'actions' && (
              <span className={styles.navAlert} />
            )}
            {tab === 'log' && unreadLog > 0 && mobileTab !== 'log' && (
              <span className={styles.navBadge}>{unreadLog > 9 ? '9+' : unreadLog}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
