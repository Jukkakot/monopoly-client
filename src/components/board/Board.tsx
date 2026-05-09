import styles from './Board.module.css'
import BoardSpot from './BoardSpot'
import { SPOTS } from '../../types/spots'
import type { SessionState } from '../../types/api'

interface Props {
  state: SessionState
}

export default function Board({ state }: Props) {
  const playersBySpot = new Map<number, typeof state.players>()
  for (const p of state.players) {
    if (!p.bankrupt && !p.eliminated) {
      const list = playersBySpot.get(p.boardIndex) ?? []
      list.push(p)
      playersBySpot.set(p.boardIndex, list)
    }
  }

  const ownerColors = new Map<string, string>()
  for (const seat of state.seats) {
    ownerColors.set(seat.playerId, seat.tokenColorHex)
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
