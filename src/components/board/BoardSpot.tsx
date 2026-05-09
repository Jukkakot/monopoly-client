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

export default function BoardSpot({ spot, index, property, players, seats, ownerColor }: Props) {
  const { row, col, isCorner } = indexToGridPos(index)

  const colorBarColor = STREET_COLORS[spot.streetType]

  const typeClass = (() => {
    switch (spot.streetType) {
      case 'COMMUNITY': return styles.community
      case 'CHANCE': return styles.chance
      case 'TAX': return styles.tax
      case 'RAILROAD': return styles.railroad
      case 'UTILITY': return styles.utility
      case 'CORNER': return styles.corner
      default: return ''
    }
  })()

  const gridStyle: React.CSSProperties = {
    gridColumn: isCorner ? `${col} / span 2` : `${col}`,
    gridRow: isCorner ? `${row} / span 2` : `${row}`,
  }

  const houseCount = property?.houseCount ?? 0
  const hotelCount = property?.hotelCount ?? 0

  return (
    <div className={`${styles.spot} ${typeClass}`} style={gridStyle} title={spot.name}>
      {colorBarColor && spot.streetType !== 'CORNER' && (
        <div className={styles.colorBar} style={{ background: colorBarColor }} />
      )}

      {hotelCount > 0 && (
        <div className={styles.buildings}>
          <div className={styles.hotel} />
        </div>
      )}
      {hotelCount === 0 && houseCount > 0 && (
        <div className={styles.buildings}>
          {Array.from({ length: houseCount }).map((_, i) => (
            <div key={i} className={styles.house} />
          ))}
        </div>
      )}

      {players.length > 0 && (
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
      )}

      <div className={styles.label}>{spot.name}</div>
      {spot.price && <div className={styles.price}>€{spot.price}</div>}

      {ownerColor && (
        <div className={styles.ownerBar} style={{ background: ownerColor }} />
      )}
    </div>
  )
}
