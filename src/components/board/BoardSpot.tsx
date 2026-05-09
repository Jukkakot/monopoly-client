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

interface CornerInfo { label: string; sublabel: string; symbol: string }
function getCornerInfo(id: string): CornerInfo {
  switch (id) {
    case 'GO_SPOT':    return { label: 'GO', sublabel: 'Kerää €200', symbol: '→' }
    case 'JAIL':       return { label: 'VANKILA', sublabel: 'Vierailulla', symbol: '⛓' }
    case 'FREE_PARKING': return { label: 'VAPAA', sublabel: 'PYSÄKÖINTI', symbol: '🅿' }
    case 'GO_TO_JAIL': return { label: 'VANKILA', sublabel: 'Mene vankilaan!', symbol: '👮' }
    default:           return { label: 'N/A', sublabel: '', symbol: '' }
  }
}

const ROTATION: Record<string, string> = {
  bottom: 'rotate(180deg)',
  left:   'rotate(-90deg)',
  top:    'rotate(0deg)',
  right:  'rotate(90deg)',
}

function PlayerTokens({ players, seats }: { players: PlayerSnapshot[]; seats: SeatState[] }) {
  if (!players.length) return null
  return (
    <div className={styles.tokens}>
      {players.map(p => {
        const seat = seats.find(s => s.playerId === p.playerId)
        return (
          <svg key={p.playerId} width="9" height="9" viewBox="0 0 10 10">
            <circle cx="5" cy="5" r="4.5" fill={seat?.tokenColorHex ?? '#888'} stroke="#fff" strokeWidth="1" />
          </svg>
        )
      })}
    </div>
  )
}

export default function BoardSpot({ spot, index, property, players, seats, ownerColor }: Props) {
  const { row, col, isCorner } = indexToGridPos(index)
  const side = getSide(index)

  const gridStyle: React.CSSProperties = {
    gridColumn: isCorner ? `${col} / span 2` : `${col}`,
    gridRow:    isCorner ? `${row} / span 2` : `${row}`,
  }

  if (isCorner) {
    const { label, sublabel, symbol } = getCornerInfo(spot.id)
    return (
      <div className={`${styles.spot} ${styles.corner}`} style={gridStyle} title={spot.name}>
        <div className={styles.cornerSymbol}>{symbol}</div>
        <div className={styles.cornerLabel}>{label}</div>
        {sublabel && <div className={styles.cornerSub}>{sublabel}</div>}
        <PlayerTokens players={players} seats={seats} />
      </div>
    )
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
      className={`${styles.spot} ${typeClass}`}
      style={{ ...gridStyle, transform: ROTATION[side] }}
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
  )
}
