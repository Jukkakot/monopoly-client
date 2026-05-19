import styles from './BoardSpot.module.css'
import type { SpotDef } from '../../types/spots'
import { STREET_COLORS, indexToGridPos } from '../../types/spots'
import type { PlayerSnapshot, PropertyStateSnapshot, SeatState } from '../../types/api'
import { EMOJI_CHAR, type TokenShape } from '../../utils/tokenShapes'

interface Props {
  spot: SpotDef
  index: number
  property?: PropertyStateSnapshot
  players: PlayerSnapshot[]
  seats: SeatState[]
  ownerColor?: string
  onClick?: () => void
  tokenShapes?: Map<string, TokenShape>
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

function TokenSvg({ color, shape, size }: { color: string; shape: TokenShape; size: number }) {
  const emoji = EMOJI_CHAR[shape]
  const s = size
  const c = s / 2
  const r = s / 2 - 0.5

  if (emoji) {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth="1" opacity="0.2" />
        <text x={c} y={c + 1} textAnchor="middle" dominantBaseline="middle" fontSize={s * 0.7}>{emoji}</text>
      </svg>
    )
  }

  if (shape === 'star') {
    const points = Array.from({ length: 5 }, (_, i) => {
      const outerA = (i * 72 - 90) * Math.PI / 180
      const innerA = outerA + 36 * Math.PI / 180
      const ro = r, ri = r * 0.45
      return [
        `${c + ro * Math.cos(outerA)},${c + ro * Math.sin(outerA)}`,
        `${c + ri * Math.cos(innerA)},${c + ri * Math.sin(innerA)}`,
      ]
    }).flat().join(' ')
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth="0.8" />
      </svg>
    )
  }

  if (shape === 'square') {
    const pad = 0.8
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x={pad} y={pad} width={s - pad * 2} height={s - pad * 2} rx="1.5" fill={color} stroke="#fff" strokeWidth="0.8" />
      </svg>
    )
  }

  if (shape === 'triangle') {
    const points = `${c},${0.8} ${s - 0.8},${s - 0.8} ${0.8},${s - 0.8}`
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <polygon points={points} fill={color} stroke="#fff" strokeWidth="0.8" />
      </svg>
    )
  }

  // Default: circle
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <circle cx={c} cy={c} r={r} fill={color} stroke="#fff" strokeWidth="1" />
    </svg>
  )
}

function PlayerTokens({ players, seats, tokenShapes }: {
  players: PlayerSnapshot[]
  seats: SeatState[]
  tokenShapes?: Map<string, TokenShape>
}) {
  if (!players.length) return null
  return (
    <div className={styles.tokens}>
      {players.map(p => {
        const seat = seats.find(s => s.playerId === p.playerId)
        const shape = tokenShapes?.get(p.playerId) ?? 'circle'
        return (
          <TokenSvg
            key={p.playerId}
            color={seat?.tokenColorHex ?? '#888'}
            shape={shape}
            size={10}
          />
        )
      })}
    </div>
  )
}

function GoCorner({ players, seats, tokenShapes }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape> }) {
  return (
    <div className={`${styles.corner} ${styles.goCorner}`}>
      <div className={styles.goArrow}>→</div>
      <div className={styles.goText}>GO</div>
      <div className={styles.goSub}>Kerää €200</div>
      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} />
    </div>
  )
}

function JailCorner({ players, seats, tokenShapes }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape> }) {
  return (
    <div className={`${styles.corner} ${styles.jailCorner}`}>
      <div className={styles.jailTop}>⛓</div>
      <div className={styles.jailLabel}>Vankila</div>
      <div className={styles.jailSub}>Vierailulla</div>
      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} />
    </div>
  )
}

function ParkingCorner({ players, seats, tokenShapes }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape> }) {
  return (
    <div className={`${styles.corner} ${styles.parkingCorner}`}>
      <div className={styles.cornerSymbol}>🅿</div>
      <div className={styles.cornerLabel}>Vapaa</div>
      <div className={styles.cornerLabel}>Pysäköinti</div>
      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} />
    </div>
  )
}

function GoJailCorner({ players, seats, tokenShapes }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape> }) {
  return (
    <div className={`${styles.corner} ${styles.goJailCorner}`}>
      <div className={styles.cornerSymbol}>👮</div>
      <div className={styles.cornerLabel}>Mene</div>
      <div className={styles.cornerLabel}>Vankilaan!</div>
      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} />
    </div>
  )
}

export default function BoardSpot({ spot, index, property, players, seats, ownerColor, onClick, tokenShapes }: Props) {
  const { row, col } = indexToGridPos(index)
  const side = getSide(index)

  const gridStyle: React.CSSProperties = {
    gridColumn: `${col}`,
    gridRow: `${row}`,
  }

  if (side === 'corner') {
    const inner =
      spot.id === 'GO_SPOT'      ? <GoCorner players={players} seats={seats} tokenShapes={tokenShapes} /> :
      spot.id === 'JAIL'         ? <JailCorner players={players} seats={seats} tokenShapes={tokenShapes} /> :
      spot.id === 'FREE_PARKING' ? <ParkingCorner players={players} seats={seats} tokenShapes={tokenShapes} /> :
                                   <GoJailCorner players={players} seats={seats} tokenShapes={tokenShapes} />
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

      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} />

      <div className={styles.label}>{spot.name}</div>
      {spot.price && <div className={styles.price}>€{spot.price}</div>}

      {ownerColor && (
        <div className={styles.ownerBar} style={{ background: ownerColor }} />
      )}
    </div>
    </div>
  )
}
