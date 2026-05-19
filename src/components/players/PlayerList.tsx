import { useRef, useEffect, useState } from 'react'
import styles from './PlayerList.module.css'
import type { SessionState, PlayerSnapshot } from '../../types/api'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import { loadTokenShapes } from '../../utils/tokenShapes'
import { TokenSvg } from '../board/TokenSvg'

interface Props {
  state: SessionState
  onSpotClick?: (spotId: string) => void
}

function PropertyExpanded({ player, state, onSpotClick }: { player: PlayerSnapshot; state: SessionState; onSpotClick?: (spotId: string) => void }) {
  const ownedProps = state.properties.filter(p => p.ownerPlayerId === player.playerId)
  if (ownedProps.length === 0) return <div className={styles.noProps}>Ei kiinteistöjä</div>

  // Group by streetType
  const groups = new Map<string, typeof ownedProps>()
  for (const prop of ownedProps) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    const key = spot?.streetType ?? 'OTHER'
    const arr = groups.get(key) ?? []
    arr.push(prop)
    groups.set(key, arr)
  }

  return (
    <div className={styles.expanded}>
      {Array.from(groups.entries()).map(([type, props]) => {
        const color = STREET_COLORS[type]
        return (
          <div key={type} className={styles.propGroup}>
            {props.map(prop => {
              const spot = SPOTS.find(s => s.id === prop.propertyId)
              return (
                <div key={prop.propertyId} className={`${styles.propRow} ${onSpotClick ? styles.propRowClickable : ''}`}
                  onClick={() => onSpotClick?.(prop.propertyId)}>
                  <span className={styles.propDot} style={{ background: color ?? '#aaa' }} />
                  <span className={styles.propName}>{spot?.name ?? prop.propertyId}</span>
                  <span className={styles.propBuildings}>
                    {prop.mortgaged
                      ? <span className={styles.mortgaged}>P</span>
                      : prop.hotelCount > 0
                        ? <span className={styles.hotel}>H</span>
                        : Array.from({ length: prop.houseCount }).map((_, i) =>
                            <span key={i} className={styles.house} />
                          )
                    }
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default function PlayerList({ state, onSpotClick }: Props) {
  const activeId = state.turn?.activePlayerId
  const prevCash = useRef<Map<string, number>>(new Map())
  const [flashMap, setFlashMap] = useState<Map<string, 'up' | 'down'>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const tokenShapes = loadTokenShapes(state.sessionId)

  const maxCash = Math.max(...state.players.map(p => p.cash), 1)

  useEffect(() => {
    const newFlash = new Map<string, 'up' | 'down'>()
    for (const player of state.players) {
      const prev = prevCash.current.get(player.playerId)
      if (prev !== undefined && prev !== player.cash) {
        newFlash.set(player.playerId, player.cash > prev ? 'up' : 'down')
      }
      prevCash.current.set(player.playerId, player.cash)
    }
    if (newFlash.size > 0) {
      setFlashMap(newFlash)
      const t = setTimeout(() => setFlashMap(new Map()), 600)
      return () => clearTimeout(t)
    }
  }, [state.players])

  // Sort players by seat index to show turn order
  const sortedPlayers = [...state.players].sort((a, b) => {
    const sa = state.seats.find(s => s.playerId === a.playerId)?.seatIndex ?? 99
    const sb = state.seats.find(s => s.playerId === b.playerId)?.seatIndex ?? 99
    return sa - sb
  })

  return (
    <div className={styles.list}>
      {sortedPlayers.map((player, turnIdx) => {
        const seat = state.seats.find(s => s.playerId === player.playerId)
        const spotName = SPOTS[player.boardIndex]?.name ?? `#${player.boardIndex}`
        const isActive = player.playerId === activeId
        const isBankrupt = player.bankrupt || player.eliminated
        const flash = flashMap.get(player.playerId)

        const isExpanded = expandedId === player.playerId

        return (
          <div
            key={player.playerId}
            className={`${styles.card} ${isActive ? styles.active : ''} ${isBankrupt ? styles.bankrupt : ''}`}
            onClick={() => setExpandedId(isExpanded ? null : player.playerId)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.token}>
                <TokenSvg
                  color={seat?.tokenColorHex ?? '#888'}
                  shape={tokenShapes[seat?.seatIndex ?? -1] ?? 'circle'}
                  size={28}
                />
              </div>
              <div className={styles.info}>
                <div className={styles.name}>
                  <span className={styles.turnNum}>{turnIdx + 1}.</span>
                  {player.name}
                  {isBankrupt && <span className={styles.badge}>konkurssi</span>}
                  {player.inJail && !isBankrupt && (
                    <span className={styles.badge}>🔒{player.jailRoundsRemaining > 0 ? `${player.jailRoundsRemaining}v` : ''}</span>
                  )}
                  {player.getOutOfJailCards > 0 && !isBankrupt && (
                    <span className={`${styles.badge} ${styles.cardBadge}`}>🃏×{player.getOutOfJailCards}</span>
                  )}
                </div>
                <div className={styles.details}>
                  {spotName} · {player.ownedPropertyIds.length} kiin.
                </div>
              </div>
              <div className={`${styles.cash} ${flash === 'up' ? styles.cashUp : flash === 'down' ? styles.cashDown : ''}`}>
                €{player.cash}
              </div>
              <span className={styles.chevron}>{isExpanded ? '▴' : '▾'}</span>
            </div>
            {!isBankrupt && (
              <div className={styles.wealthBar}>
                <div
                  className={styles.wealthBarFill}
                  style={{
                    width: `${Math.round((player.cash / maxCash) * 100)}%`,
                    background: seat?.tokenColorHex ?? '#2e7d32',
                  }}
                />
              </div>
            )}
            {isExpanded && <PropertyExpanded player={player} state={state} onSpotClick={onSpotClick} />}
          </div>
        )
      })}
    </div>
  )
}
