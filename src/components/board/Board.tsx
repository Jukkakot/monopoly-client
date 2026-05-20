import { useState } from 'react'
import styles from './Board.module.css'
import BoardSpot from './BoardSpot'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import { RENT_TABLE, GROUP_SIZE } from '../../types/rents'
import type { SessionState } from '../../types/api'
import { loadTokenShapes, type TokenShape } from '../../utils/tokenShapes'
import { useTokenAnimation } from '../../hooks/useTokenAnimation'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'

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

function GroupOwnershipBar({ state, activeGroup, onGroupClick }: {
  state: SessionState
  activeGroup?: string
  onGroupClick?: (group: string | null) => void
}) {
  const ownerColors = new Map<string, string>()
  for (const seat of state.seats) ownerColors.set(seat.playerId, seat.tokenColorHex)

  return (
    <div className={styles.groupBar}>
      {BOARD_GROUPS.map(group => {
        const groupColor = STREET_COLORS[group]
        const groupProps = state.properties.filter(p => {
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

function OwnershipEdgeBars({ state }: { state: SessionState }) {
  const ownerColors = new Map<string, string>()
  for (const seat of state.seats) ownerColors.set(seat.playerId, seat.tokenColorHex)

  function color(idx: number): string | null {
    const spot = SPOTS[idx]
    if (!spot || !spot.isProperty) return null
    const prop = state.properties.find(p => p.propertyId === spot.id)
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

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.72], [0.72, 0.28]],
  3: [[0.28, 0.72], [0.5, 0.5], [0.72, 0.28]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]],
}

function DieFace({ value, size }: { value: number; size: number }) {
  const positions = DOT_POSITIONS[value] ?? []
  const s = size
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <rect x="1.5" y="1.5" width={s - 3} height={s - 3} rx={s * 0.16} fill="white"
        stroke="rgba(0,0,0,0.15)" strokeWidth="1"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
      {positions.map(([fx, fy], i) => (
        <circle key={i} cx={fx * s} cy={fy * s} r={s * 0.088} fill="#1a1a2e" />
      ))}
    </svg>
  )
}

function BoardDice({ dice }: { dice: [number, number] | null }) {
  const t = useT()
  if (!dice) return null
  const isDoubles = dice[0] === dice[1]
  return (
    <div className={styles.diceArea}>
      <DieFace value={dice[0]} size={36} />
      <DieFace value={dice[1]} size={36} />
      {isDoubles && <span className={styles.diceDoubles}>{t.doublesLabel}</span>}
    </div>
  )
}

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
  const { state: gameState } = useGame()
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })

  function handleBoardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest('[data-spot-id]') as HTMLElement | null
    const spotId = el?.dataset.spotId ?? null
    if (spotId !== hoveredSpotId) setHoveredSpotId(spotId)
    setHoverPos({ x: e.clientX, y: e.clientY })
  }

  // Use animated positions for non-bankrupt players
  const playersBySpot = new Map<number, typeof state.players>()
  for (const p of state.players) {
    if (p.bankrupt || p.eliminated) continue
    const displayIdx = animatedPositions.get(p.playerId) ?? p.boardIndex
    const list = playersBySpot.get(displayIdx) ?? []
    list.push(p)
    playersBySpot.set(displayIdx, list)
  }

  // Build playerId → shape map from localStorage
  const tokenShapes = new Map<string, TokenShape>()
  const savedShapes = loadTokenShapes(state.sessionId)
  for (const seat of state.seats) {
    const shape = savedShapes[seat.seatIndex] ?? 'circle'
    tokenShapes.set(seat.playerId, shape)
  }

  const activeTurnPlayer = state.turn
    ? state.players.find(p => p.playerId === state.turn!.activePlayerId)
    : null
  const activeSeat = activeTurnPlayer
    ? state.seats.find(s => s.playerId === activeTurnPlayer.playerId)
    : null

  const selectedSpot = selectedSpotId ? SPOTS.find(s => s.id === selectedSpotId) : null
  const selectedGroupType = selectedSpot?.streetType
  const NON_HIGHLIGHTABLE = new Set(['CORNER', 'COMMUNITY', 'CHANCE', 'TAX'])

  return (
    <>
    <div
      className={styles.board}
      onMouseMove={handleBoardMouseMove}
      onMouseLeave={() => setHoveredSpotId(null)}
    >
      {SPOTS.map((spot, idx) => {
        const property = state.properties.find(p => p.propertyId === spot.id)
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
            players={playersBySpot.get(idx) ?? []}
            seats={state.seats}
            onClick={spot.isProperty ? () => onSpotClick?.(spot.id) : undefined}
            tokenShapes={tokenShapes}
            highlighted={isSelected ? 'selected' : isGroupHighlighted ? 'group' : undefined}
          />
        )
      })}
      <div className={styles.center}>
        <OwnershipEdgeBars state={state} />
        <BoardDice dice={gameState.lastDice} />
        <div className={styles.centerLogo}>Monopoly</div>
        <div className={styles.centerSub}>Helsinki Edition</div>
        {activeTurnPlayer && state.status !== 'GAME_OVER' && (
          <div className={styles.centerTurn} style={{ color: activeSeat?.tokenColorHex ?? '#1a5c0a' }}>
            {activeTurnPlayer.name}
          </div>
        )}
        <BoardStats state={state} />
        <GroupOwnershipBar state={state} activeGroup={highlightGroupType} onGroupClick={onGroupHighlight} />
        {gameState.turnCount > 0 && (
          <div className={styles.centerTurnCount}>{t.roundLabel(gameState.turnCount)}</div>
        )}
      </div>
    </div>
    {hoveredSpotId && (
      <SpotTooltip spotId={hoveredSpotId} state={state} pos={hoverPos} />
    )}
    </>
  )
}
