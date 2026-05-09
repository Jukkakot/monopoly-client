import styles from './PlayerList.module.css'
import type { SessionState } from '../../types/api'
import { SPOTS, SPOT_INDEX } from '../../types/spots'

interface Props {
  state: SessionState
}

export default function PlayerList({ state }: Props) {
  const activeId = state.turn?.activePlayerId

  return (
    <div className={styles.list}>
      {state.players.map(player => {
        const seat = state.seats.find(s => s.playerId === player.playerId)
        const spotName = SPOTS[player.boardIndex]?.name ?? `#${player.boardIndex}`
        const isActive = player.playerId === activeId
        const isBankrupt = player.bankrupt || player.eliminated

        return (
          <div
            key={player.playerId}
            className={`${styles.card} ${isActive ? styles.active : ''} ${isBankrupt ? styles.bankrupt : ''}`}
          >
            <svg className={styles.token} width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="13" fill={seat?.tokenColorHex ?? '#888'} stroke="#fff" strokeWidth="2" />
            </svg>
            <div className={styles.info}>
              <div className={styles.name}>
                {player.name}
                {isBankrupt && <span className={styles.badge}>konkurssi</span>}
                {player.inJail && !isBankrupt && <span className={styles.badge}>🔒</span>}
              </div>
              <div className={styles.details}>
                {spotName} · {player.ownedPropertyIds.length} kiinteistöä
              </div>
            </div>
            <div className={styles.cash}>€{player.cash}</div>
          </div>
        )
      })}
    </div>
  )
}
