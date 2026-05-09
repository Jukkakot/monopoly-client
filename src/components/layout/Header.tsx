import styles from './Header.module.css'
import type { SessionState } from '../../types/api'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface Props {
  snapshot: SessionState | null
  connectionStatus: ConnectionStatus
}

const PHASE_LABELS: Record<string, string> = {
  WAITING_FOR_ROLL: 'Heittää nopat',
  WAITING_FOR_END_TURN: 'Lopettaa vuoron',
  WAITING_FOR_DECISION: 'Tekee päätöksen',
  WAITING_FOR_AUCTION: 'Huutokauppa',
  RESOLVING_DEBT: 'Selvittää velkaa',
  GAME_OVER: 'Peli päättynyt',
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  CONNECTING: 'Yhdistetään…',
  LIVE: 'LIVE',
  RECONNECTING: 'Yhdistetään uudelleen…',
  FAILED: 'Yhteys katkesi',
}

export default function Header({ snapshot, connectionStatus }: Props) {
  const turn = snapshot?.turn
  const activeName = turn
    ? snapshot?.players.find(p => p.playerId === turn.activePlayerId)?.name
    : null

  return (
    <header className={styles.header}>
      <div className={styles.title}>Monopoly Helsinki</div>
      {activeName && turn ? (
        <div className={styles.turnInfo}>
          <span className={styles.playerName}>{activeName}</span>
          <span className={styles.phase}>{PHASE_LABELS[turn.phase] ?? turn.phase}</span>
        </div>
      ) : (
        <div className={styles.turnInfo}>
          {snapshot ? 'Odottaa pelaajia…' : 'Ladataan…'}
        </div>
      )}
      <div className={`${styles.badge} ${styles[connectionStatus.toLowerCase()]}`}>
        {STATUS_LABEL[connectionStatus]}
      </div>
    </header>
  )
}
