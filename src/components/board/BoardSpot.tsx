import styles from './BoardSpot.module.css'
import type { SpotDef } from '../../types/spots'
import { STREET_COLORS, indexToGridPos } from '../../types/spots'
import type { PlayerSnapshot, PropertyStateSnapshot, SeatState } from '../../types/api'

interface Props {
  spot: SpotDef
  index: number
  property?: PropertyStateSnapshot
  players: PlayerSnapshot[]
  seats: SeatState[]
  ownerColor?: string
  onClick?: () => void
}

function getSide(idx: number): 'bottom' | 'left' | 'top' | 'right' | 'corner' {
  if (idx === 0 || idx === 10 || idx === 20 || idx === 30) return 'corner'
  if (idx < 10) return 'bottom'
  if (idx < 20) return 'left'
  if (idx < 30) return 'top'
  return 'right'
}

function getSpotIcon(spot: SpotDef): string | null {
  if (spot.id === 'U1') return '⚡'
  if (spot.id === 'U2') return '💧'
  switch (spot.streetType) {
    case 'CHANCE': return '?'
    case 'COMMUNITY': return '♦'
    case 'RAILROAD': return '🚂'
    case 'TAX': return '💵'
    default: return null
  }
}

const ROTATION: Record<string, string> = {
  bottom: 'rotate(0deg)',
  left:   'rotate(90deg)',
  top:    'rotate(180deg)',
  right:  'rotate(-90deg)',
}

function PlayerTokens({ players, seats }: { players: PlayerSnapshot[]; seats: SeatState[] }) {
  if (!players.length) return null
  return (
    <div className={styles.tokens}>
      {players.map(p => {
        const seat = seats.find(s => s.playerId === p.playerId)
        return (
          <svg key={p.playerId} width="10" height="10" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4.5" fill={seat?.tokenColorHex ?? '#888'} stroke="#fff" strokeWidth="1" />
          </svg>
        )
      })}
    </div>
  )
}

function GoCorner({ players, seats }: { players: PlayerSnapshot[]; seats: SeatState[] }) {
  return (
    <div className={`${styles.corner} ${styles.goCorner}`}>
      <div className={styles.goArrow}>→</div>
      <div className={styles.goText}>GO</div>
      <div className={styles.goSub}>Kerää €200</div>
      <PlayerTokens players={players} seats={seats} />
    </div>
  )
}

function JailCorner({ players, seats }: { players: PlayerSnapshot[]; seats: SeatState[] }) {
  return (
    <div className={`${styles.corner} ${styles.jailCorner}`}>
      <div className={styles.jailTop}>⛓</div>
      <div className={styles.jailLabel}>Vankila</div>
      <div className={styles.jailSub}>Vierailulla</div>
      <PlayerTokens players={players} seats={seats} />
    </div>
  )
}

function ParkingCorner({ players, seats }: { players: PlayerSnapshot[]; seats: SeatState[] }) {
  return (
    <div className={`${styles.corner} ${styles.parkingCorner}`}>
      <div className={styles.cornerSymbol}>🅿</div>
      <div className={styles.cornerLabel}>Vapaa</div>
      <div className={styles.cornerLabel}>Pysäköinti</div>
      <PlayerTokens players={players} seats={seats} />
    </div>
  )
}

function GoJailCorner({ players, seats }: { players: PlayerSnapshot[]; seats: SeatState[] }) {
  return (
    <div className={`${styles.corner} ${styles.goJailCorner}`}>
      <div className={styles.cornerSymbol}>👮</div>
      <div className={styles.cornerLabel}>Mene</div>
      <div className={styles.cornerLabel}>Vankilaan!</div>
      <PlayerTokens players={players} seats={seats} />
    </div>
  )
}

export default function BoardSpot({ spot, index, property, players, seats, ownerColor, onClick }: Props) {
  const { row, col } = indexToGridPos(index)
  const side = getSide(index)

  const gridStyle: React.CSSProperties = {
    gridColumn: `${col}`,
    gridRow: `${row}`,
  }

  if (side === 'corner') {
    const inner =
      spot.id === 'GO_SPOT'      ? <GoCorner players={players} seats={seats} /> :
      spot.id === 'JAIL'         ? <JailCorner players={players} seats={seats} /> :
      spot.id === 'FREE_PARKING' ? <ParkingCorner players={players} seats={seats} /> :
                                   <GoJailCorner players={players} seats={seats} />
    return <div className={styles.cornerWrapper} style={gridStyle}>{inner}</div>
  }

  const colorBarColor = STREET_COLORS[spot.streetType]
  const icon = getSpotIcon(spot)
  const houseCount = property?.houseCount ?? 0
  const hotelCount = property?.hotelCount ?? 0

  const typeClass = (() => {
    switch (spot.streetType) {
      case 'COMMUNITY': return styles.community
      case 'CHANCE':    return styles.chance
      case 'TAX':       return styles.tax
      case 'RAILROAD':  return styles.railroad
      case 'UTILITY':   return styles.utility
      default:          return ''
    }
  })()

  return (
    <div
      className={`${styles.spotWrapper} ${typeClass} ${onClick ? styles.clickable : ''}`}
      style={gridStyle}
      onClick={onClick}
    >
    <div
      className={styles.spot}
      style={{ transform: ROTATION[side] }}
      title={spot.name}
    >
      {colorBarColor && (
        <div className={styles.colorBar} style={{ background: colorBarColor }} />
      )}

      {icon && (
        <div className={spot.streetType === 'CHANCE' ? styles.chanceIcon : styles.icon}>
          {icon}
        </div>
      )}

      {(hotelCount > 0 || houseCount > 0) && (
        <div className={styles.buildings}>
          {hotelCount > 0
            ? <div className={styles.hotel} />
            : Array.from({ length: houseCount }).map((_, i) => <div key={i} className={styles.house} />)
          }
        </div>
      )}

      <PlayerTokens players={players} seats={seats} />

      <div className={styles.label}>{spot.name}</div>
      {spot.price && <div className={styles.price}>€{spot.price}</div>}

      {ownerColor && (
        <div className={styles.ownerBar} style={{ background: ownerColor }} />
      )}
    </div>
    </div>
  )
}
