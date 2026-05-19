import styles from './Header.module.css'
import type { SessionState } from '../../types/api'
import OverflowMenu from '../menu/OverflowMenu'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface Props {
  snapshot: SessionState | null
  connectionStatus: ConnectionStatus
  isSpectator?: boolean
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

export default function Header({ snapshot, connectionStatus, isSpectator }: Props) {
  const turn = snapshot?.turn
  const activePlayer = turn
    ? snapshot?.players.find(p => p.playerId === turn.activePlayerId)
    : null
  const activeSeat = activePlayer
    ? snapshot?.seats.find(s => s.playerId === activePlayer.playerId)
    : null

  return (
    <header className={styles.header}>
      <div className={styles.title}>Monopoly Helsinki</div>
      {activePlayer && turn ? (
        <div className={styles.turnInfo}>
          {activeSeat && (
            <span
              className={styles.playerDot}
              style={{ background: activeSeat.tokenColorHex }}
            />
          )}
          <span className={styles.playerName}>{activePlayer.name}</span>
          <span className={styles.phase}>{PHASE_LABELS[turn.phase] ?? turn.phase}</span>
        </div>
      ) : (
        <div className={styles.turnInfo}>
          {snapshot ? 'Odottaa pelaajia…' : 'Ladataan…'}
        </div>
      )}
      {isSpectator && <span className={styles.spectatorBadge}>👁 Katsoja</span>}
      <div className={`${styles.badge} ${styles[connectionStatus.toLowerCase()]}`}>
        {connectionStatus === 'LIVE' ? <span className={styles.liveDot} /> : null}
        {STATUS_LABEL[connectionStatus]}
      </div>
      <OverflowMenu />
    </header>
  )
}
