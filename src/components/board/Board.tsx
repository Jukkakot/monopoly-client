import { useState, useEffect, useRef, useMemo, memo } from 'react'
import styles from './Board.module.css'
import BoardSpot from './BoardSpot'
import { SPOTS, STREET_COLORS, indexToGridPos } from '../../types/spots'
import { RENT_TABLE, GROUP_SIZE } from '../../types/rents'
import type { SessionState, PlayerSnapshot, PropertyStateSnapshot, SeatState } from '../../types/api'
import { loadTokenShapes, type TokenShape } from '../../utils/tokenShapes'
import { useTokenAnimation, useJailingPlayers, useCardJumpingPlayers, useAnimatingPlayers, useSteppingPlayers } from '../../hooks/useTokenAnimation'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'
import { loadZoomMode, onZoomSettingChange } from '../../utils/zoomSettings'
import { loadDiceZoomEnabled, getAnimationConfig, loadAnimationSpeed } from '../../utils/animationSettings'
import { AnimatedDice } from '../common/DiceDisplay'
import { getCardText } from '../../i18n/cards'

// Stable empty array so spots without players get the same reference every render,
// allowing React.memo(BoardSpot) to bail out without reference-creating ?? [].
const EMPTY_PLAYERS: PlayerSnapshot[] = []

const ZOOM_SCALE = 2.5
const ZOOM_OUT_DELAY_MS = 900

const DICE_CENTER_SENTINEL = -1  // sentinel: zoom to board center (dice area)

function computeZoomTransform(spotIndex: number): string {
  if (spotIndex === DICE_CENTER_SENTINEL) return `scale(${ZOOM_SCALE})`
  const { row, col } = indexToGridPos(spotIndex)
  const tx = -ZOOM_SCALE * (col - 6) / 11 * 100
  const ty = -ZOOM_SCALE * (row - 6) / 11 * 100
  const maxOffset = (ZOOM_SCALE - 1) / 2 * 100
  const clampedTx = Math.max(-maxOffset, Math.min(maxOffset, tx))
  const clampedTy = Math.max(-maxOffset, Math.min(maxOffset, ty))
  return `translate(${clampedTx}%, ${clampedTy}%) scale(${ZOOM_SCALE})`
}

const MAX_HOUSES = 32
const MAX_HOTELS = 12

function BoardStats({ state }: { state: SessionState }) {
  const t = useT()
  const totalProps = state.properties.length
  const soldProps = state.properties.filter(p => p.ownerPlayerId !== null).length
  const houses = state.properties.reduce((s, p) => s + p.houseCount, 0)
  const hotels = state.properties.reduce((s, p) => s + p.hotelCount, 0)
  const housesLeft = MAX_HOUSES - houses
  const hotelsLeft = MAX_HOTELS - hotels
  if (soldProps === 0 && houses === 0) return null
  return (
    <div className={styles.centerStats}>
      <span title={t.soldPropsTitle}>{soldProps}/{totalProps} kiin.</span>
      {houses > 0 && (
        <span title={t.housesStockTitle(houses, housesLeft)} className={housesLeft <= 4 ? styles.centerStatWarn : undefined}>
          🏠{housesLeft}
        </span>
      )}
      {hotels > 0 && (
        <span title={t.hotelsStockTitle(hotels, hotelsLeft)} className={hotelsLeft <= 2 ? styles.centerStatWarn : undefined}>
          🏨{hotelsLeft}
        </span>
      )}
    </div>
  )
}

function SpotTooltip({ spotId, state, pos }: { spotId: string; state: SessionState; pos: { x: number; y: number } }) {
  const t = useT()
  const spot = SPOTS.find(s => s.id === spotId)
  if (!spot || !spot.isProperty) return null

  const prop = state.properties.find(p => p.propertyId === spotId)
  const owner = prop?.ownerPlayerId ? state.players.find(p => p.playerId === prop.ownerPlayerId) : null
  const ownerSeat = owner ? state.seats.find(s => s.playerId === owner.playerId) : null
  const color = STREET_COLORS[spot.streetType]

  const isStreet = !['RAILROAD', 'UTILITY', 'CORNER', 'COMMUNITY', 'CHANCE', 'TAX'].includes(spot.streetType)
  const isRailroad = spot.streetType === 'RAILROAD'
  const isUtility = spot.streetType === 'UTILITY'

  let currentRent: string | null = null
  if (owner && !prop?.mortgaged) {
    const rents = RENT_TABLE[spot.id] ?? []
    if (isStreet && rents.length >= 6) {
      const groupTotal = GROUP_SIZE[spot.streetType] ?? 0
      const ownerGroupCount = state.properties.filter(p =>
        p.ownerPlayerId === owner.playerId &&
        SPOTS.find(s => s.id === p.propertyId)?.streetType === spot.streetType
      ).length
      const isMonopoly = ownerGroupCount === groupTotal
      const level = (prop?.hotelCount ?? 0) > 0 ? 5 : (prop?.houseCount ?? 0)
      const rent = level === 0 && isMonopoly ? rents[0] * 2 : rents[level]
      currentRent = `€${rent}`
    } else if (isRailroad && rents.length >= 1) {
      const rrCount = state.properties.filter(p =>
        p.ownerPlayerId === owner.playerId &&
        SPOTS.find(s => s.id === p.propertyId)?.streetType === 'RAILROAD'
      ).length
      currentRent = `€${rents[Math.min(rrCount - 1, rents.length - 1)]}`
    } else if (isUtility) {
      const utilCount = state.properties.filter(p =>
        p.ownerPlayerId === owner.playerId &&
        SPOTS.find(s => s.id === p.propertyId)?.streetType === 'UTILITY'
      ).length
      currentRent = utilCount >= 2 ? t.utilityDiceLarge : t.utilityDiceSmall
    }
  }

  const buildings = (() => {
    if (!prop || !isStreet) return null
    if ((prop.hotelCount ?? 0) > 0) return '🏨 Hotelli'
    if ((prop.houseCount ?? 0) > 0) return `🏠`.repeat(prop.houseCount)
    return null
  })()

  // Flip tooltip if too close to right/bottom edge
  const flipX = pos.x > window.innerWidth - 180
  const flipY = pos.y > window.innerHeight - 160
  return (
    <div
      className={styles.tooltip}
      style={{
        left: flipX ? pos.x - 160 : pos.x + 14,
        top:  flipY ? pos.y - 140 : pos.y + 4,
      }}
    >
      {color && <div className={styles.tooltipBar} style={{ background: color }} />}
      <div className={styles.tooltipName}>{spot.name}</div>
      {spot.price && !owner && <div className={styles.tooltipPrice}>€{spot.price}</div>}
      {owner ? (
        <div className={styles.tooltipOwner}>
          <span className={styles.tooltipOwnerDot} style={{ background: ownerSeat?.tokenColorHex ?? '#888' }} />
          <span>{owner.name}</span>
          {prop?.mortgaged && <span className={styles.tooltipMortgaged}>P</span>}
        </div>
      ) : (
        <div className={styles.tooltipFree}>{t.freeLabel}</div>
      )}
      {currentRent && <div className={styles.tooltipRent}>{t.rentTooltip(currentRent)}</div>}
      {buildings && <div className={styles.tooltipBuildings}>{buildings}</div>}
    </div>
  )
}

const BOARD_GROUPS = ['BROWN', 'LIGHT_BLUE', 'PURPLE', 'ORANGE', 'RED', 'YELLOW', 'GREEN', 'DARK_BLUE'] as const

function GroupOwnershipBar({ properties, seats, activeGroup, onGroupClick }: {
  properties: PropertyStateSnapshot[]
  seats: SeatState[]
  activeGroup?: string
  onGroupClick?: (group: string | null) => void
}) {
  const ownerColors = new Map<string, string>()
  for (const seat of seats) ownerColors.set(seat.playerId, seat.tokenColorHex)

  return (
    <div className={styles.groupBar}>
      {BOARD_GROUPS.map(group => {
        const groupColor = STREET_COLORS[group]
        const groupProps = properties.filter(p => {
          const spot = SPOTS.find(s => s.id === p.propertyId)
          return spot?.streetType === group
        })
        const total = groupProps.length
        if (total === 0) return null
        const isActive = activeGroup === group
        return (
          <div
            key={group}
            className={`${styles.groupBarGroup} ${onGroupClick ? styles.groupBarClickable : ''} ${isActive ? styles.groupBarActive : ''}`}
            title={group}
            onClick={() => onGroupClick?.(isActive ? null : group)}
          >
            <div className={styles.groupBarHeader} style={{ background: groupColor }} />
            <div className={styles.groupBarSlots}>
              {groupProps.map(p => {
                const ownerColor = p.ownerPlayerId ? ownerColors.get(p.ownerPlayerId) : undefined
                return (
                  <div
                    key={p.propertyId}
                    className={styles.groupBarSlot}
                    style={{ background: ownerColor ?? 'rgba(0,0,0,0.1)' }}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OwnershipEdgeBars({ properties, seats }: { properties: PropertyStateSnapshot[]; seats: SeatState[] }) {
  const ownerColors = new Map<string, string>()
  for (const seat of seats) ownerColors.set(seat.playerId, seat.tokenColorHex)

  function color(idx: number): string | null {
    const spot = SPOTS[idx]
    if (!spot || !spot.isProperty) return null
    const prop = properties.find(p => p.propertyId === spot.id)
    return prop?.ownerPlayerId ? (ownerColors.get(prop.ownerPlayerId) ?? null) : null
  }

  // Each array runs in the direction left→right or top→bottom as seen on screen
  const bottom = [9,8,7,6,5,4,3,2,1].map(color)    // center's bottom edge → bottom-row spots
  const left   = [19,18,17,16,15,14,13,12,11].map(color) // center's left edge → left-col spots
  const top    = [21,22,23,24,25,26,27,28,29].map(color) // center's top edge → top-row spots
  const right  = [31,32,33,34,35,36,37,38,39].map(color) // center's right edge → right-col spots

  const seg = (c: string | null, i: number) => (
    <div key={i} style={{ flex: 1, background: c ?? 'transparent' }} />
  )

  return (
    <div className={styles.ownerBars} aria-hidden="true">
      <div className={styles.ownerBarBottom}>{bottom.map(seg)}</div>
      <div className={styles.ownerBarTop}>{top.map(seg)}</div>
      <div className={styles.ownerBarLeft}>{left.map(seg)}</div>
      <div className={styles.ownerBarRight}>{right.map(seg)}</div>
    </div>
  )
}

const GroupOwnershipBarM = memo(GroupOwnershipBar, (prev, next) =>
  prev.properties === next.properties &&
  prev.seats === next.seats &&
  prev.activeGroup === next.activeGroup
  // onGroupClick intentionally excluded — function ref changes every render but doesn't affect output
)

const OwnershipEdgeBarsM = memo(OwnershipEdgeBars, (prev, next) =>
  prev.properties === next.properties && prev.seats === next.seats
)


interface Props {
  state: SessionState
  onSpotClick?: (spotId: string) => void
  selectedSpotId?: string
  highlightGroupType?: string
  onGroupHighlight?: (groupType: string | null) => void
}

export default function Board({ state, onSpotClick, selectedSpotId, highlightGroupType, onGroupHighlight }: Props) {
  const t = useT()
  const animatedPositions = useTokenAnimation()
  const jailingPlayers = useJailingPlayers()
  const cardJumpingPlayers = useCardJumpingPlayers()
  const steppingPlayers = useSteppingPlayers()
  const animatingPlayers = useAnimatingPlayers()
  const { state: gameState, sendCmd } = useGame()
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })

  const [zoomMode, setZoomMode] = useState(loadZoomMode)
  const [zoomedSpot, setZoomedSpot] = useState<number | null>(null)
  const zoomOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userZoomedOutRef = useRef(false)
  const stateRef = useRef(state)
  const prevAnimatingSizeRef = useRef(0)
  const prevActivePlayerRef = useRef<string | null | undefined>(null)
  useEffect(() => { stateRef.current = state }, [state])
  // Ref so timer callbacks can read the current displayed position (start square, not destination)
  const animatedPositionsRef = useRef(animatedPositions)
  useEffect(() => { animatedPositionsRef.current = animatedPositions }, [animatedPositions])

  // Track dice rolls for AnimatedDice key
  const [diceRollKey, setDiceRollKey] = useState(0)
  const prevDiceStrRef = useRef<string | null>(null)
  const diceStr = gameState.lastDice ? gameState.lastDice.join(',') : null
  useEffect(() => {
    if (diceStr && diceStr !== prevDiceStrRef.current) {
      prevDiceStrRef.current = diceStr
      setDiceRollKey(k => k + 1)
    }
  }, [diceStr])

  // Dice zoom: zoom to board center when new dice arrive, hold until first token step.
  // diceZoomBlockRef prevents animatedPositions/animatingPlayers effects from overriding
  // the sentinel until the token actually moves (pos changes from its settled start pos).
  const zoomToDiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevDiceForZoomRef = useRef<string | null>(diceStr)  // init to current → no zoom on mount
  const diceZoomBlockRef = useRef(false)
  const animStartPosRef = useRef<number | null>(null)

  useEffect(() => {
    if (!diceStr || diceStr === prevDiceForZoomRef.current) return
    if (loadZoomMode() === 'off') return
    if (!loadDiceZoomEnabled()) return
    const pid = stateRef.current.turn?.activePlayerId
    if (pid && !shouldZoomForPlayer(pid)) return
    prevDiceForZoomRef.current = diceStr
    userZoomedOutRef.current = false
    diceZoomBlockRef.current = true
    animStartPosRef.current = null  // reset so lazy-init fires on first animatedPositions fire
    if (zoomOutTimerRef.current) clearTimeout(zoomOutTimerRef.current)
    if (zoomToDiceTimerRef.current) clearTimeout(zoomToDiceTimerRef.current)
    setZoomedSpot(DICE_CENTER_SENTINEL)
    // Three-phase chain (timings sum to diceToMoveDelayMs):
    //   phase 1 ~550ms: dice animation plays (DICE_ANIM_MS, hardcoded in AnimatedDice)
    //   phase 2  400ms: settled dice value visible (SETTLED_HOLD)
    //   phase 3   rest: preview player's starting square
    //   → first token step fires at diceToMoveDelayMs
    const DICE_ANIM_MS = 550
    const SETTLED_HOLD = 400
    const transitionAt = DICE_ANIM_MS + SETTLED_HOLD   // 950ms: switch from dice to player
    const movDelay = getAnimationConfig(loadAnimationSpeed()).diceToMoveDelayMs
    zoomToDiceTimerRef.current = setTimeout(() => {
      zoomToDiceTimerRef.current = null
      diceZoomBlockRef.current = false
      // Use animatedPositionsRef (current displayed position = start square) so the zoom
      // previews where the token IS, not where it's going (snapshot already has final pos).
      const startPos = pid
        ? (animatedPositionsRef.current.get(pid) ?? stateRef.current.players.find(p => p.playerId === pid)?.boardIndex)
        : undefined
      if (startPos !== undefined) setZoomedSpot(startPos)
      // Fallback: zoom out if no movement follows (jail, etc.)
      zoomToDiceTimerRef.current = setTimeout(() => {
        zoomToDiceTimerRef.current = null
        setZoomedSpot(null)
      }, Math.max(400, movDelay - transitionAt) + 800)
    }, transitionAt)
  }, [diceStr])

  // Manual pinch-to-zoom state
  const [pinch, setPinch] = useState({ scale: 1, tx: 0, ty: 0 })
  const pinchGestureRef = useRef<{
    type: 'pinch' | 'pan'
    startDist: number
    startScale: number
    startTx: number
    startTy: number
    bx: number   // pinch center fraction from board center (-0.5..0.5)
    by: number
    startTouchX: number
    startTouchY: number
    boardW: number
    boardH: number
  } | null>(null)

  function handlePinchTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      e.preventDefault()
      userZoomedOutRef.current = true  // suspend auto-zoom while manually zooming
      const rect = e.currentTarget.getBoundingClientRect()
      const t1 = e.touches[0], t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const midX = (t1.clientX + t2.clientX) / 2
      const midY = (t1.clientY + t2.clientY) / 2
      pinchGestureRef.current = {
        type: 'pinch',
        startDist: dist,
        startScale: pinch.scale,
        startTx: pinch.tx,
        startTy: pinch.ty,
        bx: (midX - rect.left) / rect.width - 0.5,
        by: (midY - rect.top) / rect.height - 0.5,
        startTouchX: midX, startTouchY: midY,
        boardW: rect.width, boardH: rect.height,
      }
    } else if (e.touches.length === 1 && pinch.scale > 1.05) {
      e.preventDefault()
      const rect = e.currentTarget.getBoundingClientRect()
      pinchGestureRef.current = {
        type: 'pan',
        startDist: 0,
        startScale: pinch.scale,
        startTx: pinch.tx,
        startTy: pinch.ty,
        bx: 0, by: 0,
        startTouchX: e.touches[0].clientX,
        startTouchY: e.touches[0].clientY,
        boardW: rect.width, boardH: rect.height,
      }
    }
  }

  function handlePinchTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const g = pinchGestureRef.current
    if (!g) return
    e.preventDefault()

    if (g.type === 'pinch' && e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const S2 = Math.max(1, Math.min(6, g.startScale * dist / g.startDist))
      // Keep pinch center fixed: tx' = startTx + 100 * bx * (S1 - S2)
      const maxT = 50 * (S2 - 1)
      const newTx = Math.max(-maxT, Math.min(maxT, g.startTx + 100 * g.bx * (g.startScale - S2)))
      const newTy = Math.max(-maxT, Math.min(maxT, g.startTy + 100 * g.by * (g.startScale - S2)))
      setPinch({ scale: S2, tx: newTx, ty: newTy })

    } else if (g.type === 'pan' && e.touches.length === 1) {
      const touch = e.touches[0]
      const maxT = 50 * (g.startScale - 1)
      const newTx = Math.max(-maxT, Math.min(maxT,
        g.startTx + (touch.clientX - g.startTouchX) / g.boardW * 100 / g.startScale))
      const newTy = Math.max(-maxT, Math.min(maxT,
        g.startTy + (touch.clientY - g.startTouchY) / g.boardH * 100 / g.startScale))
      setPinch({ scale: g.startScale, tx: newTx, ty: newTy })
    }
  }

  function handlePinchTouchEnd() {
    pinchGestureRef.current = null
    setPinch(p => p.scale < 1.15 ? { scale: 1, tx: 0, ty: 0 } : p)
  }

  useEffect(() => onZoomSettingChange(() => {
    const mode = loadZoomMode()
    setZoomMode(mode)
    if (mode === 'off') {
      if (zoomOutTimerRef.current) clearTimeout(zoomOutTimerRef.current)
      setZoomedSpot(null)
    }
  }), [])

  function shouldZoomForPlayer(pid: string): boolean {
    const mode = loadZoomMode()
    if (mode === 'off') return false
    if (mode === 'all') return true
    const myId = gameState.myPlayerId
    if (!myId) return true // spectator: follow everyone
    return pid === myId
  }

  // Follow the active player's token step by step during animation.
  // When diceZoomBlockRef is active, we do a lazy-init of animStartPosRef on the
  // very first fire (so we don't depend on animation-start effect running first).
  // The block is released only when pos actually differs from the recorded start pos.
  useEffect(() => {
    if (userZoomedOutRef.current) return
    if (animatingPlayers.size === 0) return
    const pid = stateRef.current.turn?.activePlayerId
    if (!pid || !animatingPlayers.has(pid)) return
    if (!shouldZoomForPlayer(pid)) return
    const pos = animatedPositions.get(pid)
    if (pos === undefined) return

    if (diceZoomBlockRef.current) {
      if (animStartPosRef.current === null) {
        // First fire with dice zoom active — record current displayed pos as baseline
        animStartPosRef.current = pos
      }
      if (pos === animStartPosRef.current) return  // token hasn't moved yet, keep dice zoom
      // First real step: release block and hand off to token zoom
      diceZoomBlockRef.current = false
      animStartPosRef.current = null
      if (zoomToDiceTimerRef.current) { clearTimeout(zoomToDiceTimerRef.current); zoomToDiceTimerRef.current = null }
    }
    setZoomedSpot(pos)
  }, [animatedPositions, animatingPlayers])

  // Detect animation start/end — only resets state, zoom is handled above
  useEffect(() => {
    const nowSize = animatingPlayers.size
    const prevSize = prevAnimatingSizeRef.current
    prevAnimatingSizeRef.current = nowSize

    if (nowSize > 0 && prevSize === 0) {
      userZoomedOutRef.current = false
      if (zoomOutTimerRef.current) clearTimeout(zoomOutTimerRef.current)
      // If no dice zoom is active, start following immediately from the settled pos
      if (!diceZoomBlockRef.current) {
        const pid = stateRef.current.turn?.activePlayerId
        if (pid && animatingPlayers.has(pid) && shouldZoomForPlayer(pid)) {
          const startPos = animatedPositions.get(pid)
            ?? stateRef.current.players.find(p => p.playerId === pid)?.boardIndex
          if (startPos !== undefined) setZoomedSpot(startPos)
        }
      }
    }

    if (nowSize === 0 && prevSize > 0) {
      animStartPosRef.current = null
      zoomOutTimerRef.current = setTimeout(() => setZoomedSpot(null), ZOOM_OUT_DELAY_MS)
    }
  }, [animatingPlayers])

  useEffect(() => () => {
    if (zoomOutTimerRef.current) clearTimeout(zoomOutTimerRef.current)
    if (zoomToDiceTimerRef.current) clearTimeout(zoomToDiceTimerRef.current)
  }, [])

  // Reset zoom immediately when the active player changes (next turn started)
  const activePlayerId = state.turn?.activePlayerId
  useEffect(() => {
    const prev = prevActivePlayerRef.current
    prevActivePlayerRef.current = activePlayerId
    if (prev !== null && prev !== undefined && prev !== activePlayerId) {
      if (zoomOutTimerRef.current) clearTimeout(zoomOutTimerRef.current)
      userZoomedOutRef.current = false
      setZoomedSpot(null)
    }
  }, [activePlayerId])

  void zoomMode // triggers re-render when setting changes so shouldZoomForPlayer stays fresh

  // While a player is animating, keep showing previous ownership for properties they just acquired
  const prevProperties = gameState.prevSnapshot?.properties
  const displayProperties = (animatingPlayers.size > 0 && prevProperties)
    ? state.properties.map(p => {
        if (!p.ownerPlayerId || !animatingPlayers.has(p.ownerPlayerId)) return p
        const prev = prevProperties.find(pp => pp.propertyId === p.propertyId)
        if (prev?.ownerPlayerId === p.ownerPlayerId) return p
        return { ...p, ownerPlayerId: prev?.ownerPlayerId ?? null, houseCount: prev?.houseCount ?? 0, hotelCount: prev?.hotelCount ?? 0, mortgaged: prev?.mortgaged ?? false }
      })
    : state.properties
  const displayState = displayProperties === state.properties ? state : { ...state, properties: displayProperties }

  function handleBoardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest('[data-spot-id]') as HTMLElement | null
    const spotId = el?.dataset.spotId ?? null
    if (spotId !== hoveredSpotId) setHoveredSpotId(spotId)
    setHoverPos({ x: e.clientX, y: e.clientY })
  }

  // Recompute only when player data or animated positions change.
  // EMPTY_PLAYERS is a stable module-level constant so empty spots always get the same reference.
  const playersBySpot = useMemo(() => {
    const map = new Map<number, PlayerSnapshot[]>()
    for (const p of state.players) {
      if (p.bankrupt || p.eliminated) continue
      const displayIdx = animatedPositions.get(p.playerId) ?? p.boardIndex
      const existing = map.get(displayIdx)
      if (existing) existing.push(p)
      else map.set(displayIdx, [p])
    }
    return map
  }, [state.players, animatedPositions])

  // Token shapes come from localStorage and sessionId — stable for a session's lifetime.
  const tokenShapes = useMemo(() => {
    const map = new Map<string, TokenShape>()
    const savedShapes = loadTokenShapes(state.sessionId)
    for (const seat of state.seats) {
      map.set(seat.playerId, savedShapes[seat.seatIndex] ?? 'circle')
    }
    return map
  }, [state.sessionId])

  const activeTurnPlayer = state.turn
    ? state.players.find(p => p.playerId === state.turn!.activePlayerId)
    : null
  const activeSeat = activeTurnPlayer
    ? state.seats.find(s => s.playerId === activeTurnPlayer.playerId)
    : null

  const isCardAck = state.turn?.phase === 'WAITING_FOR_CARD_ACK'
  const cardBubbleText = isCardAck ? getCardText(state.lastCardKey ?? null, state.lastCardMessage ?? null) : null
  const isChanceCard = state.lastCardKey?.startsWith('chance') ?? false
  const cardBubbleIcon = isChanceCard ? '?' : '🏙'
  const cardBubbleTypeLabel = isChanceCard ? 'Sattuma' : 'Yhteinen kassa'

  // Position card bubble at the INNER EDGE of the token's cell so the tail
  // visually attaches to the board spot border, not just the cell center.
  const cardBubblePos = useMemo(() => {
    if (!cardBubbleText || !activeTurnPlayer) return null
    const displayIdx = animatedPositions.get(activeTurnPlayer.playerId) ?? activeTurnPlayer.boardIndex
    const { row, col } = indexToGridPos(displayIdx)
    const cellW = 1 / 11  // one cell as fraction of board

    let tailDir: 'top' | 'bottom' | 'left' | 'right'
    let ax: number  // anchor x (0–1)
    let ay: number  // anchor y (0–1)

    if (row === 11) {
      tailDir = 'bottom'
      ax = (col - 0.5) * cellW        // cell center horizontally
      ay = (row - 1) * cellW           // TOP edge of bottom row = inner border
    } else if (row === 1) {
      tailDir = 'top'
      ax = (col - 0.5) * cellW
      ay = row * cellW                 // BOTTOM edge of top row = inner border
    } else if (col === 11) {
      tailDir = 'right'
      ax = (col - 1) * cellW           // LEFT edge of right col = inner border
      ay = (row - 0.5) * cellW
    } else {
      tailDir = 'left'
      ax = col * cellW                 // RIGHT edge of left col = inner border
      ay = (row - 0.5) * cellW
    }

    return { x: `${ax * 100}%`, y: `${ay * 100}%`, tailDir }
  }, [cardBubbleText, activeTurnPlayer, animatedPositions])

  const isMyCardAck = isCardAck && state.turn?.activePlayerId === gameState.myPlayerId

  const selectedSpot = selectedSpotId ? SPOTS.find(s => s.id === selectedSpotId) : null
  const selectedGroupType = selectedSpot?.streetType
  const NON_HIGHLIGHTABLE = new Set(['CORNER', 'COMMUNITY', 'CHANCE', 'TAX'])

  const hasPinch = pinch.scale > 1.05

  const boardStyle: React.CSSProperties = {}
  if (hasPinch) {
    boardStyle.transform = `translate(${pinch.tx}%, ${pinch.ty}%) scale(${pinch.scale})`
    boardStyle.transition = 'none'
  } else if (zoomedSpot !== null) {
    boardStyle.transform = computeZoomTransform(zoomedSpot)
  }

  return (
    <>
    <div
      className={styles.board}
      style={boardStyle}
      onMouseMove={handleBoardMouseMove}
      onMouseLeave={() => setHoveredSpotId(null)}
      onTouchStart={handlePinchTouchStart}
      onTouchMove={handlePinchTouchMove}
      onTouchEnd={handlePinchTouchEnd}
    >
      {SPOTS.map((spot, idx) => {
        const property = displayState.properties.find(p => p.propertyId === spot.id)
        const isSelected = spot.id === selectedSpotId
        const isGroupHighlighted = !isSelected && (
          (selectedGroupType && spot.streetType === selectedGroupType && !NON_HIGHLIGHTABLE.has(selectedGroupType)) ||
          (highlightGroupType && spot.streetType === highlightGroupType && !NON_HIGHLIGHTABLE.has(highlightGroupType))
        )
        return (
          <BoardSpot
            key={spot.id}
            spot={spot}
            index={idx}
            property={property}
            players={playersBySpot.get(idx) ?? EMPTY_PLAYERS}
            seats={state.seats}
            onClick={spot.isProperty ? () => onSpotClick?.(spot.id) : undefined}
            tokenShapes={tokenShapes}
            jailingPlayers={jailingPlayers}
            cardJumpingPlayers={cardJumpingPlayers}
            steppingPlayers={steppingPlayers}
            highlighted={isSelected ? 'selected' : isGroupHighlighted ? 'group' : undefined}
          />
        )
      })}
      <div className={styles.center}>
        <OwnershipEdgeBarsM properties={displayState.properties} seats={displayState.seats} />
        <AnimatedDice dice={gameState.lastDice} rollKey={diceRollKey} className={styles.diceArea} />
        <div className={styles.centerLogo}>Monopoly</div>
        <div className={styles.centerSub}>Helsinki Edition</div>
        {activeTurnPlayer && state.status !== 'GAME_OVER' && (
          <div className={styles.centerTurn} style={{ color: activeSeat?.tokenColorHex ?? '#1a5c0a' }}>
            {activeTurnPlayer.name}
          </div>
        )}
        <BoardStats state={displayState} />
        <GroupOwnershipBarM properties={displayState.properties} seats={displayState.seats} activeGroup={highlightGroupType} onGroupClick={onGroupHighlight} />
        {gameState.turnCount > 0 && (
          <div className={styles.centerTurnCount}>{t.roundLabel(gameState.turnCount)}</div>
        )}
      </div>
      {cardBubblePos && cardBubbleText && (() => {
        const tailCls = { top: styles.tailTop, bottom: styles.tailBottom, left: styles.tailLeft, right: styles.tailRight }[cardBubblePos.tailDir]
        const colorCls = isChanceCard ? styles.cardChance : styles.cardCommunity
        const ackCmd = isMyCardAck
          ? () => sendCmd({ type: 'AcknowledgeCard', sessionId: state.sessionId, actorPlayerId: gameState.myPlayerId! })
          : undefined
        return (<>
          {isMyCardAck && <div className={styles.cardDismissOverlay} onClick={ackCmd} />}
          <div className={`${styles.cardBubbleAnchor} ${tailCls}`} style={{ left: cardBubblePos.x, top: cardBubblePos.y }}>
            <div className={`${styles.cardBubble} ${colorCls}`} onClick={ackCmd} style={{ cursor: isMyCardAck ? 'pointer' : 'default' }}>
              <div className={styles.cardBubbleHeader}>
                <span className={styles.cardBubbleType}>{cardBubbleTypeLabel}</span>
                <span className={styles.cardBubbleIcon}>{cardBubbleIcon}</span>
              </div>
              <div className={styles.cardBubbleBody}>
                <span className={styles.cardBubbleText}>{cardBubbleText}</span>
                <span className={styles.cardBubblePlayer}>{activeTurnPlayer?.name ?? '?'}</span>
              </div>
            </div>
          </div>
        </>)
      })()}
    </div>
    {(zoomedSpot !== null || hasPinch) && (
      <button className={styles.zoomOutBtn} onClick={() => {
        userZoomedOutRef.current = true
        setZoomedSpot(null)
        setPinch({ scale: 1, tx: 0, ty: 0 })
      }}>
        {t.zoomOutBtn}
      </button>
    )}
    {hoveredSpotId && (
      <SpotTooltip spotId={hoveredSpotId} state={displayState} pos={hoverPos} />
    )}
    </>
  )
}
