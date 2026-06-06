import styles from './AppLayout.module.css'
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { SPOTS } from '../../types/spots'
import { PropertyChip, PropertyChipWrap } from '../common/PropertyChip'

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
  // Cap at 50% of screen height so the action area below is always reachable
  return typeof window !== 'undefined'
    ? Math.min(MOBILE_BOARD_H_MAX, Math.max(MOBILE_BOARD_H_MIN, Math.min(window.innerWidth, Math.floor(window.innerHeight * 0.5))))
    : 320
}


type MobileTab = 'board' | 'players' | 'log'

const MOBILE_TABS: MobileTab[] = ['board', 'players', 'log']

/** Smoothly counts a number to a new value over ~350 ms. */
function AnimatedCash({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const frameRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    if (from === value) return
    const duration = 350
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value])

  return <>{display}</>
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
  const { state } = useGame()
  const snap = state.snapshot
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
  const [playersCollapsed, setPlayersCollapsed] = useState(() => {
    try { return localStorage.getItem('monopoly_players_collapsed') === '1' } catch { return false }
  })
  const [logCollapsed, setLogCollapsed] = useState(() => {
    try { return localStorage.getItem('monopoly_log_collapsed') === '1' } catch { return false }
  })
  const [actionsCollapsed, setActionsCollapsed] = useState(() => {
    try { return localStorage.getItem('monopoly_actions_collapsed') === '1' } catch { return false }
  })
  const [actionsHeight, setActionsHeight] = useState(() => {
    try { const v = parseInt(localStorage.getItem('monopoly_actions_height') ?? ''); return isNaN(v) ? 220 : Math.max(60, Math.min(600, v)) } catch { return 220 }
  })
  const actionsHeightRef = useRef(220)
  const actionsDragRef = useRef<{ startY: number; startH: number } | null>(null)
  useEffect(() => { actionsHeightRef.current = actionsHeight }, [actionsHeight])

  // Content-height tracking for auto-expand
  const actionsContentRef = useRef<HTMLDivElement>(null)
  const [actionsContentH, setActionsContentH] = useState(0)
  const mobileActionsWrapperRef = useRef<HTMLDivElement>(null)
  const mobileActionsContentRef = useRef<HTMLDivElement>(null)
  const [mobileActionsContentH, setMobileActionsContentH] = useState(0)
  const savedMobileBoardHRef = useRef<number | null>(null)

  const [playersSplitPx, setPlayersSplitPx] = useState(() => {
    try { const v = parseInt(localStorage.getItem('monopoly_players_split_px') ?? ''); return isNaN(v) ? 250 : Math.max(60, Math.min(600, v)) } catch { return 250 }
  })

  // Animation: cash delta floats + chip shake
  const [cashDeltas, setCashDeltas] = useState<Array<{ playerId: string; amount: number; key: number }>>([])
  const prevCashRef = useRef(new Map<string, number>())
  const deltaKeyRef = useRef(0)
  // Animation: bankruptcy collapse
  const [justBankrupt, setJustBankrupt] = useState(new Set<string>())
  const prevBankruptRef = useRef(new Set<string>())
  // Animation: turn-start highlight on active player's cash chip
  const [turnFlashId, setTurnFlashId] = useState<string | null>(null)
  const prevActivePlayerIdRef = useRef<string | null>(null)

  const dragStartX = useRef<number | null>(null)
  const dragStartW = useRef<number>(sidebarWidth)
  const splitDragRef = useRef<{ startY: number; startPx: number } | null>(null)
  const splitPxRef = useRef(playersSplitPx)
  useEffect(() => { splitPxRef.current = playersSplitPx }, [playersSplitPx])

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
    function onSplitMove(e: MouseEvent) {
      if (!splitDragRef.current) return
      const delta = e.clientY - splitDragRef.current.startY
      const newPx = Math.max(60, Math.min(600, splitDragRef.current.startPx + delta))
      setPlayersSplitPx(newPx)
    }
    function onSplitUp() {
      if (!splitDragRef.current) return
      splitDragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try { localStorage.setItem('monopoly_players_split_px', String(Math.round(splitPxRef.current))) } catch {}
    }
    function onActionsMove(e: MouseEvent) {
      if (!actionsDragRef.current) return
      const delta = actionsDragRef.current.startY - e.clientY
      const newH = Math.max(60, Math.min(600, actionsDragRef.current.startH + delta))
      setActionsHeight(newH)
    }
    function onActionsUp() {
      if (!actionsDragRef.current) return
      actionsDragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try { localStorage.setItem('monopoly_actions_height', String(actionsHeightRef.current)) } catch {}
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mousemove', onSplitMove)
    window.addEventListener('mouseup', onSplitUp)
    window.addEventListener('mousemove', onActionsMove)
    window.addEventListener('mouseup', onActionsUp)
    return () => {
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onSplitMove); window.removeEventListener('mouseup', onSplitUp)
      window.removeEventListener('mousemove', onActionsMove); window.removeEventListener('mouseup', onActionsUp)
    }
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

  // Track cash changes → delta floats + chip shake; track new bankruptcies → collapse anim
  useEffect(() => {
    if (!snap) return
    const deltasToAdd: typeof cashDeltas = []
    const newBankrupt: string[] = []

    for (const p of snap.players) {
      const prevCash = prevCashRef.current.get(p.playerId)
      if (prevCash !== undefined && !p.bankrupt && p.cash < prevCash) {
        const key = ++deltaKeyRef.current
        const k = key
        deltasToAdd.push({ playerId: p.playerId, amount: prevCash - p.cash, key })
        setTimeout(() => setCashDeltas(d => d.filter(x => x.key !== k)), 1350)
      }
      prevCashRef.current.set(p.playerId, p.cash)

      if (p.bankrupt && !prevBankruptRef.current.has(p.playerId)) {
        prevBankruptRef.current.add(p.playerId)
        newBankrupt.push(p.playerId)
        const id = p.playerId
        setTimeout(() => setJustBankrupt(s => { const n = new Set(s); n.delete(id); return n }), 900)
      }
    }

    if (deltasToAdd.length > 0) setCashDeltas(d => [...d, ...deltasToAdd])
    if (newBankrupt.length > 0) setJustBankrupt(s => new Set([...s, ...newBankrupt]))

    const activeId = snap.turn?.activePlayerId ?? null
    if (activeId && activeId !== prevActivePlayerIdRef.current) {
      prevActivePlayerIdRef.current = activeId
      setTurnFlashId(activeId)
      setTimeout(() => setTurnFlashId(null), 700)
    }
  }, [snap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Desktop: observe actions content height → display = max(user-drag, content)
  useEffect(() => {
    const el = actionsContentRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setActionsContentH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Mobile portrait: observe action content; when it overflows the wrapper, shrink the board
  // by exactly the overflow amount so all content fits without scrolling.
  useEffect(() => {
    const content = mobileActionsContentRef.current
    if (!content) return
    const ro = new ResizeObserver(([e]) => setMobileActionsContentH(e.contentRect.height))
    ro.observe(content)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!isMobile || isLandscape || mobileTab !== 'board') return
    const wrapper = mobileActionsWrapperRef.current
    if (!wrapper) return
    const wrapperH = wrapper.clientHeight
    const overflow = mobileActionsContentH - wrapperH
    if (overflow > 4) {
      if (savedMobileBoardHRef.current === null) savedMobileBoardHRef.current = mobileBoardHeightRef.current
      setMobileBoardHeight(h => Math.max(MOBILE_BOARD_H_MIN, h - overflow))
    } else if (overflow <= 0 && savedMobileBoardHRef.current !== null) {
      setMobileBoardHeight(savedMobileBoardHRef.current)
      savedMobileBoardHRef.current = null
    }
  }, [mobileActionsContentH, isMobile, isLandscape, mobileTab]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className={styles.sideSection} data-side-section>
          <div className={styles.upperSections}>
            <div className={styles.sideSectionHeader}
              onClick={() => { const v = !playersCollapsed; setPlayersCollapsed(v); try { localStorage.setItem('monopoly_players_collapsed', v ? '1' : '0') } catch {} }}>
              <span className={styles.sideSectionTitle}>👥 Pelaajat</span>
              <span className={styles.sideSectionChevron}>{playersCollapsed ? '▸' : '▾'}</span>
            </div>
            {!playersCollapsed && (
              <div className={styles.playersWrapper} style={{ height: playersSplitPx }}>{players}</div>
            )}
            <div className={styles.sideDivider}
              onMouseDown={!playersCollapsed && !logCollapsed ? e => {
                splitDragRef.current = { startY: e.clientY, startPx: splitPxRef.current }
                document.body.style.cursor = 'row-resize'
                document.body.style.userSelect = 'none'
              } : undefined}
              style={!playersCollapsed && !logCollapsed ? { cursor: 'row-resize' } : undefined}
            />
            <div className={styles.sideSectionHeader}
              onClick={() => { const v = !logCollapsed; setLogCollapsed(v); try { localStorage.setItem('monopoly_log_collapsed', v ? '1' : '0') } catch {} }}>
              <span className={styles.sideSectionTitle}>📋 Tapahtumaloki</span>
              <span className={styles.sideSectionChevron}>{logCollapsed ? '▸' : '▾'}</span>
            </div>
            {!logCollapsed && (
              <div className={styles.logWrapper}>{log}</div>
            )}
          </div>
          {/* Actions: pinned to bottom, collapsible, resizable */}
          {!isMobile && (
            <div className={styles.actionsSection}>
              <div
                className={styles.actionsDragHandle}
                onMouseDown={e => {
                  actionsDragRef.current = { startY: e.clientY, startH: actionsHeightRef.current }
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
              />
              <div className={styles.sideSectionHeader}
                onClick={() => { const v = !actionsCollapsed; setActionsCollapsed(v); try { localStorage.setItem('monopoly_actions_collapsed', v ? '1' : '0') } catch {} }}>
                <span className={styles.sideSectionTitle}>🎮 Toiminnot</span>
                <span className={styles.sideSectionChevron}>{actionsCollapsed ? '▸' : '▾'}</span>
              </div>
              {!actionsCollapsed && (
                <div className={styles.actionsWrapper} style={{ height: Math.max(actionsHeight, actionsContentH) }}>
                  <div ref={actionsContentRef}>{actions}</div>
                </div>
              )}
            </div>
          )}
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
                        cashDeltas.some(d => d.playerId === p.playerId) ? styles.cashChipShake : '',
                        justBankrupt.has(p.playerId) ? styles.cashChipBankruptAnim : '',
                        turnFlashId === p.playerId ? styles.cashChipTurnStart : '',
                      ].join(' ')}
                      onClick={() => setCashPopupPlayerId(p.playerId)}
                    >
                      <span className={styles.cashDot} style={{ background: seat?.tokenColorHex ?? '#888' }} />
                      <span className={styles.cashName}>{p.name}</span>
                      <span className={styles.cashAmt}>
                        {p.bankrupt ? '💀' : <>€<AnimatedCash value={p.cash} /></>}
                      </span>
                      {cashDeltas.filter(d => d.playerId === p.playerId).map(d => (
                        <span key={d.key} className={styles.cashDeltaFloat}>−€{d.amount}</span>
                      ))}
                    </div>
                  )
                })}
            </div>
          )}

          <div className={styles.mobileSection}>
            {/* Only render actions on mobile — desktop renders its own instance above.
                Keep mounted (not conditionally) so internal state survives tab switches. */}
            {isMobile && <div ref={mobileActionsWrapperRef} className={[
              styles.mobileActionWrapper,
              mobileTab !== 'board' ? styles.mobileHidden : '',
              boardEntering ? (animDir === 'right' ? styles.slideFromLeft : styles.slideFromRight) : '',
            ].join(' ')}><div ref={mobileActionsContentRef}>{actions}</div></div>}
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
                  <span className={styles.navAlert} data-testid="mobile-board-alert" />
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
                <span className={styles.playerPopupCash}>€<AnimatedCash value={player.cash} /></span>
                <button className={styles.playerPopupClose} onClick={() => setCashPopupPlayerId(null)}>✕</button>
              </div>
              {ownedProps.length === 0 ? (
                <div className={styles.playerPopupNoProps}>{t.noPropertiesMsg}</div>
              ) : (
                <div className={styles.playerPopupProps}>
                  <PropertyChipWrap>
                    {sorted.flatMap(([, props]) =>
                      props.map(prop => (
                        <PropertyChip
                          key={prop.propertyId}
                          id={prop.propertyId}
                          mortgaged={prop.mortgaged}
                        />
                      ))
                    )}
                  </PropertyChipWrap>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
