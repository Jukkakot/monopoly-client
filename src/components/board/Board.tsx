import styles from './Board.module.css'
import BoardSpot from './BoardSpot'
import { SPOTS } from '../../types/spots'
import type { SessionState } from '../../types/api'
import { loadTokenShapes, type TokenShape } from '../../utils/tokenShapes'
import { useTokenAnimation } from '../../hooks/useTokenAnimation'
import { useGame } from '../../store/GameContext'

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
  if (!dice) return null
  const isDoubles = dice[0] === dice[1]
  return (
    <div className={styles.diceArea}>
      <DieFace value={dice[0]} size={36} />
      <DieFace value={dice[1]} size={36} />
      {isDoubles && <span className={styles.diceDoubles}>tupla</span>}
    </div>
  )
}

interface Props {
  state: SessionState
  onSpotClick?: (spotId: string) => void
}

export default function Board({ state, onSpotClick }: Props) {
  const animatedPositions = useTokenAnimation()
  const { state: gameState } = useGame()

  // Use animated positions for non-bankrupt players
  const playersBySpot = new Map<number, typeof state.players>()
  for (const p of state.players) {
    if (p.bankrupt || p.eliminated) continue
    const displayIdx = animatedPositions.get(p.playerId) ?? p.boardIndex
    const list = playersBySpot.get(displayIdx) ?? []
    list.push(p)
    playersBySpot.set(displayIdx, list)
  }

  const ownerColors = new Map<string, string>()
  for (const seat of state.seats) {
    ownerColors.set(seat.playerId, seat.tokenColorHex)
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

  return (
    <div className={styles.board}>
      {SPOTS.map((spot, idx) => {
        const property = state.properties.find(p => p.propertyId === spot.id)
        const ownerColor = property?.ownerPlayerId ? ownerColors.get(property.ownerPlayerId) : undefined
        return (
          <BoardSpot
            key={spot.id}
            spot={spot}
            index={idx}
            property={property}
            players={playersBySpot.get(idx) ?? []}
            seats={state.seats}
            ownerColor={ownerColor}
            onClick={spot.isProperty ? () => onSpotClick?.(spot.id) : undefined}
            tokenShapes={tokenShapes}
          />
        )
      })}
      <div className={styles.center}>
        <BoardDice dice={gameState.lastDice} />
        <div className={styles.centerLogo}>Monopoly</div>
        <div className={styles.centerSub}>Helsinki Edition</div>
        {activeTurnPlayer && state.status !== 'GAME_OVER' && (
          <div className={styles.centerTurn} style={{ color: activeSeat?.tokenColorHex ?? '#1a5c0a' }}>
            {activeTurnPlayer.name}
          </div>
        )}
      </div>
    </div>
  )
}
