import styles from './Board.module.css'
import BoardSpot from './BoardSpot'
import { SPOTS } from '../../types/spots'
import type { SessionState } from '../../types/api'
import { loadTokenShapes, type TokenShape } from '../../utils/tokenShapes'
import { useTokenAnimation } from '../../hooks/useTokenAnimation'

interface Props {
  state: SessionState
  onSpotClick?: (spotId: string) => void
}

export default function Board({ state, onSpotClick }: Props) {
  const animatedPositions = useTokenAnimation()

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
    const shape = savedShapes[seat.index] ?? 'circle'
    tokenShapes.set(seat.playerId, shape)
  }

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
        <div className={styles.centerLogo}>Monopoly</div>
        <div className={styles.centerSub}>Helsinki Edition</div>
      </div>
    </div>
  )
}
