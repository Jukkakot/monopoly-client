import { memo } from 'react'
import styles from './BoardSpot.module.css'
import type { SpotDef } from '../../types/spots'
import { STREET_COLORS, indexToGridPos } from '../../types/spots'
import type { PlayerSnapshot, PropertyStateSnapshot, SeatState } from '../../types/api'
import { type TokenShape } from '../../utils/tokenShapes'
import { TokenSvg } from './TokenSvg'
import { useT } from '../../i18n/LanguageContext'

interface Props {
  spot: SpotDef
  index: number
  property?: PropertyStateSnapshot
  players: PlayerSnapshot[]
  seats: SeatState[]
  onClick?: () => void
  tokenShapes?: Map<string, TokenShape>
  jailingPlayers?: Set<string>
  cardJumpingPlayers?: Set<string>
  steppingPlayers?: Set<string>
  landingPlayers?: Set<string>
  goFlash?: boolean
  highlighted?: 'selected' | 'group'
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


function PlayerTokens({ players, seats, tokenShapes, jailingPlayers, cardJumpingPlayers, steppingPlayers, landingPlayers }: {
  players: PlayerSnapshot[]
  seats: SeatState[]
  tokenShapes?: Map<string, TokenShape>
  jailingPlayers?: Set<string>
  cardJumpingPlayers?: Set<string>
  steppingPlayers?: Set<string>
  landingPlayers?: Set<string>
}) {
  if (!players.length) return null
  return (
    <div className={styles.tokens} data-count={players.length}>
      {players.map(p => {
        const seat = seats.find(s => s.playerId === p.playerId)
        const shape = tokenShapes?.get(p.playerId) ?? 'circle'
        const isJailing = jailingPlayers?.has(p.playerId) ?? false
        const isCardJumping = cardJumpingPlayers?.has(p.playerId) ?? false
        const isLanding = landingPlayers?.has(p.playerId) ?? false
        const isStepping = steppingPlayers?.has(p.playerId) ?? false
        const animClass = isJailing ? styles.jailArrive
          : isCardJumping ? styles.cardArrive
          : isLanding ? styles.tokenLand
          : isStepping ? styles.stepHop
          : undefined
        return (
          <span key={p.playerId} className={animClass}>
            <TokenSvg
              color={seat?.tokenColorHex ?? '#888'}
              shape={shape}
            />
          </span>
        )
      })}
    </div>
  )
}

function GoCorner({ players, seats, tokenShapes, steppingPlayers, landingPlayers, goFlash }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape>; steppingPlayers?: Set<string>; landingPlayers?: Set<string>; goFlash?: boolean }) {
  const t = useT()
  return (
    <div className={`${styles.corner} ${styles.goCorner} ${goFlash ? styles.goCornerFlash : ''}`}>
      <div className={styles.goArrow}>→</div>
      <div className={styles.goText}>GO</div>
      <div className={styles.goSub}>{t.goCollect}</div>
      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} />
    </div>
  )
}

function JailCorner({ players, seats, tokenShapes, jailingPlayers, steppingPlayers, landingPlayers }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape>; jailingPlayers?: Set<string>; steppingPlayers?: Set<string>; landingPlayers?: Set<string> }) {
  const t = useT()
  const jailed = players.filter(p => p.inJail)
  const visiting = players.filter(p => !p.inJail)
  return (
    <div className={`${styles.corner} ${styles.jailCorner}`}>
      <div className={styles.jailTop}>⛓</div>
      <div className={styles.jailLabel}>{t.jailLabel}</div>
      {jailed.length > 0 && (
        <div className={styles.jailPrisoners}>
          {jailed.map(p => {
            const seat = seats.find(s => s.playerId === p.playerId)
            const shape = tokenShapes?.get(p.playerId) ?? 'circle'
            const isJailing = jailingPlayers?.has(p.playerId) ?? false
            return (
              <div key={p.playerId} className={styles.jailPrisonerRow}>
                <span className={isJailing ? styles.jailArrive : undefined}>
                  <TokenSvg color={seat?.tokenColorHex ?? '#888'} shape={shape} />
                </span>
                <span className={styles.jailRounds}>{p.jailRoundsRemaining}v</span>
              </div>
            )
          })}
        </div>
      )}
      {visiting.length > 0 && (
        <>
          <div className={styles.jailSub}>{t.visitingLabel}</div>
          <PlayerTokens players={visiting} seats={seats} tokenShapes={tokenShapes} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} />
        </>
      )}
    </div>
  )
}

function ParkingCorner({ players, seats, tokenShapes, steppingPlayers, landingPlayers }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape>; steppingPlayers?: Set<string>; landingPlayers?: Set<string> }) {
  const t = useT()
  return (
    <div className={`${styles.corner} ${styles.parkingCorner}`}>
      <div className={styles.cornerSymbol}>🅿</div>
      <div className={styles.cornerLabel}>{t.freeParkingLine1}</div>
      <div className={styles.cornerLabel}>{t.freeParkingLine2}</div>
      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} />
    </div>
  )
}

function GoJailCorner({ players, seats, tokenShapes, steppingPlayers, landingPlayers }: { players: PlayerSnapshot[]; seats: SeatState[]; tokenShapes?: Map<string, TokenShape>; steppingPlayers?: Set<string>; landingPlayers?: Set<string> }) {
  const t = useT()
  return (
    <div className={`${styles.corner} ${styles.goJailCorner}`}>
      <div className={styles.cornerSymbol}>👮</div>
      <div className={styles.cornerLabel}>{t.goToJailLine1}</div>
      <div className={styles.cornerLabel}>{t.goToJailLine2}</div>
      <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} />
    </div>
  )
}

function BoardSpot(props: Props) {
  const { spot, index, property, players, seats, onClick, tokenShapes, jailingPlayers, cardJumpingPlayers, steppingPlayers, landingPlayers, goFlash, highlighted } = props
  const { row, col } = indexToGridPos(index)
  const side = getSide(index)

  const gridStyle: React.CSSProperties = {
    gridColumn: `${col}`,
    gridRow: `${row}`,
  }

  if (side === 'corner') {
    const inner =
      spot.id === 'GO_SPOT'      ? <GoCorner players={players} seats={seats} tokenShapes={tokenShapes} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} goFlash={goFlash} /> :
      spot.id === 'JAIL'         ? <JailCorner players={players} seats={seats} tokenShapes={tokenShapes} jailingPlayers={jailingPlayers} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} /> :
      spot.id === 'FREE_PARKING' ? <ParkingCorner players={players} seats={seats} tokenShapes={tokenShapes} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} /> :
                                   <GoJailCorner players={players} seats={seats} tokenShapes={tokenShapes} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} />
    return <div className={styles.cornerWrapper} style={{ ...gridStyle, zIndex: players.length > 0 ? 10 : 1 }}>{inner}</div>
  }

  const isStreet = spot.streetType !== 'RAILROAD' && spot.streetType !== 'UTILITY'
    && spot.streetType !== 'CORNER' && spot.streetType !== 'COMMUNITY'
    && spot.streetType !== 'CHANCE' && spot.streetType !== 'TAX'
  const colorBarColor = isStreet ? STREET_COLORS[spot.streetType] : undefined
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

  const highlightClass = highlighted === 'selected' ? styles.highlightSelected : highlighted === 'group' ? styles.highlightGroup : ''

  return (
    <div
      className={`${styles.spotWrapper} ${typeClass} ${onClick ? styles.clickable : ''} ${highlightClass} ${property?.mortgaged ? styles.mortgagedSpot : ''}`}
      style={{ ...gridStyle, zIndex: players.length > 0 ? 10 : 1 }}
      onClick={onClick}
      data-spot-id={spot.id}
    >
    <div
      className={styles.spot}
      style={{ transform: ROTATION[side], ...(colorBarColor ? { paddingTop: '30%' } : {}) }}
      title={spot.name}
    >
      {colorBarColor && (
        <div
          className={`${styles.colorBar} ${property?.mortgaged ? styles.colorBarMortgaged : ''}`}
          style={{ background: property?.mortgaged ? '#9e9e9e' : colorBarColor }}
        >
          {property?.mortgaged
            ? <div className={styles.mortgagedLabel}>P</div>
            : hotelCount > 0
              ? <div className={styles.hotelInBar} />
              : Array.from({ length: houseCount }).map((_, i) => <div key={i} className={styles.houseInBar} />)
          }
        </div>
      )}

      {icon && (
        <div className={spot.streetType === 'CHANCE' ? styles.chanceIcon : styles.icon}>
          {icon}
        </div>
      )}

      <div className={styles.label}>{spot.name}</div>
      {spot.price && <div className={styles.price}>€{spot.price}</div>}
    </div>
    {/* Tokens rendered outside the rotated .spot so they sit in spotWrapper's stacking
        context and are never clipped or obscured by the color bar. */}
    <PlayerTokens players={players} seats={seats} tokenShapes={tokenShapes} jailingPlayers={jailingPlayers} cardJumpingPlayers={cardJumpingPlayers} steppingPlayers={steppingPlayers} landingPlayers={landingPlayers} />
    </div>
  )
}

// Custom comparator: skip onClick, tokenShapes, spot, index and seats (all static or functions).
// Re-render only when the visual data actually changes.
function spotPropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.property === next.property &&
    prev.players === next.players &&
    prev.highlighted === next.highlighted &&
    prev.jailingPlayers === next.jailingPlayers &&
    prev.cardJumpingPlayers === next.cardJumpingPlayers &&
    prev.steppingPlayers === next.steppingPlayers &&
    prev.landingPlayers === next.landingPlayers &&
    prev.goFlash === next.goFlash
  )
}

export default memo(BoardSpot, spotPropsEqual)
