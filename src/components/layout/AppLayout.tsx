import styles from './AppLayout.module.css'
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'

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

type MobileTab = 'board' | 'players' | 'log'

const MOBILE_TABS: MobileTab[] = ['board', 'players', 'log']

interface Props {
  header: ReactNode
  board: ReactNode
  players: ReactNode
  log: ReactNode
  actions: ReactNode
}

export default function AppLayout({ header, board, players, log, actions }: Props) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('board')
  const { state } = useGame()
  const t = useT()
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

  const snap = state.snapshot
  const isMyTurn = !!(snap && snap.turn &&
    snap.turn.activePlayerId === state.myPlayerId &&
    snap.status !== 'GAME_OVER')

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
      <div className={styles.resizeHandle} onMouseDown={onDragStart} title={t.resizeHandleTitle} />

      {/* ── Desktop: sidebar ── */}
      <div className={styles.sideCol} style={{ flexBasis: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}>
        <div className={styles.sideHeader}>{header}</div>
        <div className={styles.sideSection}>
          <div className={styles.playersWrapper}>{players}</div>
          <div className={styles.sideDivider} />
          <div className={styles.logWrapper}>{log}</div>
        </div>
        <div className={styles.actions}>{actions}</div>
      </div>

      {/* ── Mobile: content area (above bottom nav) ── */}
      <div className={styles.mobileContent}>
        <div className={styles.mobileHeader}>{header}</div>
        <div className={mobileTab === 'board' ? styles.mobileBoard : styles.mobileBoardHidden}>
          {board}
        </div>
        <div className={styles.mobileSection}>
          {/* Keep actions mounted so popup-dismiss state survives tab switches */}
          <div className={`${styles.mobilePadded} ${mobileTab !== 'board' ? styles.mobileHidden : ''}`}>{actions}</div>
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
            {t.mobileTabs[tab]}
            {tab === 'board' && isMyTurn && mobileTab !== 'board' && (
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
