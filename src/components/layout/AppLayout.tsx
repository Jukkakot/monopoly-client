import styles from './AppLayout.module.css'
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { SPOTS, STREET_COLORS } from '../../types/spots'

type AnimDir = 'right' | 'left'

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

const MOBILE_PANEL_MIN = 160
const MOBILE_PANEL_MAX = 500

function loadMobilePanelWidth(): number {
  try {
    const v = localStorage.getItem('monopoly_mobile_panel_width')
    if (v) { const n = parseInt(v); if (n >= MOBILE_PANEL_MIN && n <= MOBILE_PANEL_MAX) return n }
  } catch {}
  return typeof window !== 'undefined'
    ? Math.min(MOBILE_PANEL_MAX, Math.max(MOBILE_PANEL_MIN, window.innerWidth - window.innerHeight))
    : 240
}

const MOBILE_BOARD_H_MIN = 150
const MOBILE_BOARD_H_MAX = 560

function loadMobileBoardHeight(): number {
  try {
    const v = localStorage.getItem('monopoly_mobile_board_height')
    if (v) { const n = parseInt(v); if (n >= MOBILE_BOARD_H_MIN && n <= MOBILE_BOARD_H_MAX) return n }
  } catch {}
  return typeof window !== 'undefined'
    ? Math.min(MOBILE_BOARD_H_MAX, Math.max(MOBILE_BOARD_H_MIN, window.innerWidth))
    : 320
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
  const [mobilePanelWidth, setMobilePanelWidth] = useState(loadMobilePanelWidth)
  const [mobileBoardHeight, setMobileBoardHeight] = useState(loadMobileBoardHeight)
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: landscape) and (max-width: 767px)').matches
      : false
  )
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  )
  const [animKey, setAnimKey] = useState(0)
  const [animDir, setAnimDir] = useState<AnimDir>('right')
  const [boardEntering, setBoardEntering] = useState(false)
  const [cashPopupPlayerId, setCashPopupPlayerId] = useState<string | null>(null)
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

  // Mobile landscape resize handle (touch-based)
  const mobileDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const mobilePanelWidthRef = useRef(mobilePanelWidth)
  useEffect(() => { mobilePanelWidthRef.current = mobilePanelWidth }, [mobilePanelWidth])

  // Mobile portrait resize handle (touch-based, vertical)
  const portraitDragRef = useRef<{ startY: number; startH: number } | null>(null)
  const mobileBoardHeightRef = useRef(mobileBoardHeight)
  useEffect(() => { mobileBoardHeightRef.current = mobileBoardHeight }, [mobileBoardHeight])

  useEffect(() => {
    const mqLandscape = window.matchMedia('(orientation: landscape) and (max-width: 767px)')
    const handlerLandscape = (e: MediaQueryListEvent) => setIsLandscape(e.matches)
    mqLandscape.addEventListener('change', handlerLandscape)

    const mqMobile = window.matchMedia('(max-width: 767px)')
    const handlerMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mqMobile.addEventListener('change', handlerMobile)

    return () => {
      mqLandscape.removeEventListener('change', handlerLandscape)
      mqMobile.removeEventListener('change', handlerMobile)
    }
  }, [])

  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      if (mobileDragRef.current) {
        const delta = mobileDragRef.current.startX - e.touches[0].clientX
        const newW = Math.min(MOBILE_PANEL_MAX, Math.max(MOBILE_PANEL_MIN, mobileDragRef.current.startW + delta))
        setMobilePanelWidth(newW)
      }
      if (portraitDragRef.current) {
        const delta = e.touches[0].clientY - portraitDragRef.current.startY
        const newH = Math.min(MOBILE_BOARD_H_MAX, Math.max(MOBILE_BOARD_H_MIN, portraitDragRef.current.startH + delta))
        setMobileBoardHeight(newH)
      }
    }
    function onTouchEnd() {
      if (mobileDragRef.current) {
        mobileDragRef.current = null
        try { localStorage.setItem('monopoly_mobile_panel_width', String(mobilePanelWidthRef.current)) } catch {}
      }
      if (portraitDragRef.current) {
        portraitDragRef.current = null
        try { localStorage.setItem('monopoly_mobile_board_height', String(mobileBoardHeightRef.current)) } catch {}
      }
    }
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => { window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd) }
  }, [])

  function onMobileHandleTouchStart(e: React.TouchEvent) {
    e.stopPropagation() // prevent tab swipe from firing
    mobileDragRef.current = { startX: e.touches[0].clientX, startW: mobilePanelWidthRef.current }
  }

  function onPortraitHandleTouchStart(e: React.TouchEvent) {
    if (isLandscape) return
    portraitDragRef.current = { startY: e.touches[0].clientY, startH: mobileBoardHeightRef.current }
  }

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

  const switchTab = useCallback((tab: MobileTab) => {
    const currentIdx = MOBILE_TABS.indexOf(mobileTab)
    const nextIdx = MOBILE_TABS.indexOf(tab)
    if (tab === mobileTab) return
    const dir: AnimDir = nextIdx > currentIdx ? 'right' : 'left'
    setAnimDir(dir)
    setAnimKey(k => k + 1)
    if (tab === 'board') {
      setBoardEntering(true)
      setTimeout(() => setBoardEntering(false), 260)
    }
    setMobileTab(tab)
  }, [mobileTab])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) < 50) return
    if (dx < 0 && tabIdx < MOBILE_TABS.length - 1) switchTab(MOBILE_TABS[tabIdx + 1])
    if (dx > 0 && tabIdx > 0) switchTab(MOBILE_TABS[tabIdx - 1])
  }

  return (
    <div className={styles.root}>
      {/* ── Desktop: board column ── */}
      <div className={styles.boardCol}>
        {!isMobile && board}
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
          <div className={styles.actions}>{actions}</div>
        </div>
      </div>

      {/* ── Mobile: outer container (column in portrait, row in landscape) ── */}
      <div className={styles.mobileContent}>
        {/* Board: portrait = top section (hidden on non-board tabs); landscape = always-visible left column */}
        <div
          className={mobileTab === 'board' ? styles.mobileBoard : styles.mobileBoardHidden}
          style={isMobile && !isLandscape ? { height: mobileBoardHeight, '--board-max-size': `${mobileBoardHeight}px` } as React.CSSProperties : undefined}
        >
          {isMobile && board}
        </div>

        {/* Landscape resize handle — invisible in portrait */}
        <div className={styles.mobileResizeHandle} onTouchStart={onMobileHandleTouchStart} />

        {/* Right panel: header + content tabs + bottom nav */}
        <div className={styles.mobileRight} style={isLandscape ? { flexBasis: mobilePanelWidth, minWidth: mobilePanelWidth, maxWidth: mobilePanelWidth } : undefined} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className={styles.mobileHeader} onTouchStart={onPortraitHandleTouchStart}>{header}</div>

          {/* Cash bar — portrait board tab only; hidden in landscape (no vertical room) */}
          {snap && snap.players.length > 0 && mobileTab === 'board' && (
            <div className={styles.playerCashBar}>
              {[...snap.players]
                .sort((a, b) => a.playerId === state.myPlayerId ? -1 : b.playerId === state.myPlayerId ? 1 : 0)
                .map(p => {
                  const seat = snap.seats.find(s => s.playerId === p.playerId)
                  const isActive = snap.turn?.activePlayerId === p.playerId
                  const isMe = p.playerId === state.myPlayerId
                  return (
                    <div key={p.playerId}
                      className={[
                        styles.cashChip,
                        isActive ? styles.cashChipActive : '',
                        isMe ? styles.cashChipMe : '',
                        p.bankrupt ? styles.cashChipBankrupt : '',
                      ].join(' ')}
                      onClick={() => setCashPopupPlayerId(p.playerId)}
                    >
                      <span className={styles.cashDot} style={{ background: seat?.tokenColorHex ?? '#888' }} />
                      <span className={styles.cashName}>{p.name}</span>
                      <span className={styles.cashAmt}>{p.bankrupt ? '💀' : `€${p.cash}`}</span>
                    </div>
                  )
                })}
            </div>
          )}

          <div className={styles.mobileSection}>
            {/* Keep actions mounted so popup-dismiss state survives tab switches */}
            <div className={[
              styles.mobilePadded,
              mobileTab !== 'board' ? styles.mobileHidden : '',
              boardEntering ? (animDir === 'right' ? styles.slideFromLeft : styles.slideFromRight) : '',
            ].join(' ')}>{actions}</div>
            {mobileTab === 'players' && (
              <div key={animKey} className={animDir === 'right' ? styles.slideFromRight : styles.slideFromLeft}>{players}</div>
            )}
            {mobileTab === 'log' && (
              <div key={animKey} className={animDir === 'right' ? styles.slideFromRight : styles.slideFromLeft}>{log}</div>
            )}
          </div>

          {/* Bottom nav — in-flow inside right panel so it stays in its column in landscape */}
          <nav className={styles.mobileNav}>
            {MOBILE_TABS.map(tab => (
              <button
                key={tab}
                className={`${styles.navBtn} ${mobileTab === tab ? styles.navActive : ''}`}
                onClick={() => switchTab(tab)}
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
      </div>

      {/* ── Mobile: player summary popup ── */}
      {cashPopupPlayerId && snap && (() => {
        const player = snap.players.find(p => p.playerId === cashPopupPlayerId)
        const seat = snap.seats.find(s => s.playerId === cashPopupPlayerId)
        if (!player) return null
        const ownedProps = snap.properties.filter(p => p.ownerPlayerId === cashPopupPlayerId)
        const TYPE_ORDER = ['BROWN','LIGHT_BLUE','PURPLE','ORANGE','RED','YELLOW','GREEN','DARK_BLUE','RAILROAD','UTILITY']
        const groups = new Map<string, typeof ownedProps>()
        for (const prop of ownedProps) {
          const key = SPOTS.find(s => s.id === prop.propertyId)?.streetType ?? 'OTHER'
          const arr = groups.get(key) ?? []; arr.push(prop); groups.set(key, arr)
        }
        const sorted = [...groups.entries()].sort(([a], [b]) => {
          const ai = TYPE_ORDER.indexOf(a); const bi = TYPE_ORDER.indexOf(b)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        return (
          <div className={styles.playerPopupOverlay} onClick={() => setCashPopupPlayerId(null)}>
            <div className={styles.playerPopup} onClick={e => e.stopPropagation()}>
              <div className={styles.playerPopupHeader}>
                <span className={styles.playerPopupDot} style={{ background: seat?.tokenColorHex ?? '#888' }} />
                <span className={styles.playerPopupName}>{player.name}</span>
                <span className={styles.playerPopupCash}>€{player.cash}</span>
                <button className={styles.playerPopupClose} onClick={() => setCashPopupPlayerId(null)}>✕</button>
              </div>
              {ownedProps.length === 0 ? (
                <div className={styles.playerPopupNoProps}>{t.noPropertiesMsg}</div>
              ) : (
                <div className={styles.playerPopupProps}>
                  {sorted.map(([type, props]) => {
                    const color = STREET_COLORS[type] ?? '#888'
                    return (
                      <div key={type} className={styles.playerPopupGroup} style={{ borderLeftColor: color }}>
                        {props.map(prop => {
                          const spot = SPOTS.find(s => s.id === prop.propertyId)
                          return (
                            <div key={prop.propertyId} className={styles.playerPopupPropRow} style={prop.mortgaged ? { opacity: 0.55 } : undefined}>
                              <span className={styles.playerPopupPropDot} style={{ background: color }} />
                              <span className={`${styles.playerPopupPropName} ${prop.mortgaged ? styles.playerPopupMortgaged : ''}`}>{spot?.name ?? prop.propertyId}</span>
                              {prop.hotelCount > 0 && <span className={styles.playerPopupHotel}>🏨</span>}
                              {prop.houseCount > 0 && <span className={styles.playerPopupHouses}>{'🏠'.repeat(prop.houseCount)}</span>}
                              {prop.mortgaged && <span className={styles.playerPopupMortgagedTag}>🔒</span>}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
