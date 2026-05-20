import { useRef, useEffect, useState } from 'react'
import styles from './PlayerList.module.css'
import type { SessionState, PlayerSnapshot } from '../../types/api'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import { loadTokenShapes } from '../../utils/tokenShapes'
import { TokenSvg } from '../board/TokenSvg'
import { calcNetWorth } from '../../utils/netWorth'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 48
  const H = 16
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(' ')
  const trend = values[values.length - 1] >= values[0]
  return (
    <svg width={W} height={H} className={styles.sparkline} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={trend ? color : '#e53935'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  )
}

interface Props {
  state: SessionState
  onSpotClick?: (spotId: string) => void
  onTradeWith?: (playerId: string) => void
}

function PropertyExpanded({ player, state, onSpotClick, onTradeWith }: { player: PlayerSnapshot; state: SessionState; onSpotClick?: (spotId: string) => void; onTradeWith?: (playerId: string) => void }) {
  const t = useT()
  const ownedProps = state.properties.filter(p => p.ownerPlayerId === player.playerId)

  // Compute summary stats
  const totalHouses = ownedProps.reduce((s, p) => s + p.houseCount, 0)
  const totalHotels = ownedProps.reduce((s, p) => s + p.hotelCount, 0)
  const mortgagedCount = ownedProps.filter(p => p.mortgaged).length

  // Count monopolies
  const groupCounts = new Map<string, number>()
  const totalGroupCounts = new Map<string, number>()
  const NON_STREETS = new Set(['RAILROAD', 'UTILITY', 'CORNER', 'COMMUNITY', 'CHANCE', 'TAX'])
  for (const prop of state.properties) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot || NON_STREETS.has(spot.streetType)) continue
    totalGroupCounts.set(spot.streetType, (totalGroupCounts.get(spot.streetType) ?? 0) + 1)
    if (prop.ownerPlayerId === player.playerId)
      groupCounts.set(spot.streetType, (groupCounts.get(spot.streetType) ?? 0) + 1)
  }
  const monopolyCount = [...groupCounts.entries()].filter(([t, c]) => c === totalGroupCounts.get(t)).length

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
      {onTradeWith && (
        <button
          className={styles.tradeBtn}
          onClick={e => { e.stopPropagation(); onTradeWith(player.playerId) }}
        >
          {t.tradeWithBtn(player.name)}
        </button>
      )}
      {ownedProps.length === 0 ? (
        <div className={styles.noProps}>{t.noPropertiesMsg}</div>
      ) : (
        <>
          <div className={styles.propSummary}>
            {monopolyCount > 0 && <span className={styles.propStat}>🏆{monopolyCount} monopoli</span>}
            {totalHotels > 0 && <span className={styles.propStat}>🏨{totalHotels}</span>}
            {totalHouses > 0 && <span className={styles.propStat}>🏠{totalHouses}</span>}
            {mortgagedCount > 0 && <span className={`${styles.propStat} ${styles.propStatMuted}`}>{t.mortgagedStat(mortgagedCount)}</span>}
          </div>
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
        </>
      )}
    </div>
  )
}

const NON_STREET_TYPES = new Set(['CORNER', 'COMMUNITY', 'CHANCE', 'TAX'])

function GroupDots({ player, state }: { player: PlayerSnapshot; state: SessionState }) {
  const myGroupCounts = new Map<string, number>()
  const totalGroupCounts = new Map<string, number>()
  for (const prop of state.properties) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot || NON_STREET_TYPES.has(spot.streetType)) continue
    totalGroupCounts.set(spot.streetType, (totalGroupCounts.get(spot.streetType) ?? 0) + 1)
    if (prop.ownerPlayerId === player.playerId)
      myGroupCounts.set(spot.streetType, (myGroupCounts.get(spot.streetType) ?? 0) + 1)
  }
  if (myGroupCounts.size === 0) return null
  return (
    <div className={styles.groupDots}>
      {Array.from(myGroupCounts.entries()).map(([type, count]) => {
        const color = STREET_COLORS[type] ?? '#aaa'
        const total = totalGroupCounts.get(type) ?? 1
        const isMonopoly = count === total
        return (
          <span
            key={type}
            className={`${styles.groupDot} ${isMonopoly ? styles.groupDotMonopoly : ''}`}
            style={{ background: color, boxShadow: isMonopoly ? `0 0 0 2px ${color}` : undefined }}
            title={`${type}: ${count}/${total}`}
          />
        )
      })}
    </div>
  )
}

export default function PlayerList({ state, onSpotClick, onTradeWith }: Props) {
  const t = useT()
  const activeId = state.turn?.activePlayerId
  const prevCash = useRef<Map<string, number>>(new Map())
  const [flashMap, setFlashMap] = useState<Map<string, 'up' | 'down'>>(new Map())
  const { state: gs } = useGame()
  const [expandedId, setExpandedId] = useState<string | null>(() => gs.myPlayerId ?? null)
  const tokenShapes = loadTokenShapes(state.sessionId)

  // Auto-expand own card when myPlayerId becomes known (e.g. after SSE connect)
  const autoExpanded = useRef(gs.myPlayerId != null)
  useEffect(() => {
    if (!autoExpanded.current && gs.myPlayerId) {
      autoExpanded.current = true
      setExpandedId(id => id ?? gs.myPlayerId)
    }
  }, [gs.myPlayerId])
  const netWorthHistory = gs.netWorthHistory

  const maxNetWorth = Math.max(...state.players.map(p => calcNetWorth(p, state)), 1)

  // Wealth rank by net worth (excluding bankrupt)
  const activePlayers = state.players.filter(p => !p.bankrupt && !p.eliminated)
  const rankedByWealth = [...activePlayers].sort((a, b) => calcNetWorth(b, state) - calcNetWorth(a, state))
  const wealthRank = new Map(rankedByWealth.map((p, i) => [p.playerId, i]))

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
        const isMe = player.playerId === gs.myPlayerId
        const netWorth = isBankrupt ? 0 : calcNetWorth(player, state)
        const rank = wealthRank.get(player.playerId) ?? -1
        const rankEmoji = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null

        return (
          <div
            key={player.playerId}
            className={`${styles.card} ${isActive ? styles.active : ''} ${isBankrupt ? styles.bankrupt : ''} ${isMe ? styles.me : ''}`}
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
                  {isMe && <span className={styles.meBadge}>{t.youBadge}</span>}
                  {isBankrupt && <span className={styles.badge}>{t.bankruptBadge}</span>}
                  {player.inJail && !isBankrupt && (
                    <span className={styles.badge}>🔒{player.jailRoundsRemaining > 0 ? `${player.jailRoundsRemaining}v` : ''}</span>
                  )}
                  {player.getOutOfJailCards > 0 && !isBankrupt && (
                    <span className={`${styles.badge} ${styles.cardBadge}`}>🃏×{player.getOutOfJailCards}</span>
                  )}
                </div>
                <div className={styles.details}>
                  {spotName} · {t.propAbbr(player.ownedPropertyIds.length)}
                </div>
                {!isBankrupt && player.ownedPropertyIds.length > 0 && (
                  <GroupDots player={player} state={state} />
                )}
              </div>
              <div className={styles.cashCol}>
                <div className={styles.cashRow}>
                  {rankEmoji && activePlayers.length > 1 && (
                    <span className={styles.rankEmoji}>{rankEmoji}</span>
                  )}
                  <div className={`${styles.cash} ${flash === 'up' ? styles.cashUp : flash === 'down' ? styles.cashDown : ''}`}>
                    €{player.cash}
                  </div>
                </div>
                {!isBankrupt && netWorth !== player.cash && (
                  <div className={styles.netWorth}>~€{netWorth}</div>
                )}
                {!isBankrupt && (() => {
                  const history = netWorthHistory.get(player.playerId) ?? []
                  return history.length >= 2
                    ? <Sparkline values={history} color={seat?.tokenColorHex ?? '#2e7d32'} />
                    : null
                })()}
              </div>
              <span className={styles.chevron}>{isExpanded ? '▴' : '▾'}</span>
            </div>
            {!isBankrupt && (
              <div className={styles.wealthBar}>
                <div
                  className={styles.wealthBarFill}
                  style={{
                    width: `${Math.round((netWorth / maxNetWorth) * 100)}%`,
                    background: seat?.tokenColorHex ?? '#2e7d32',
                  }}
                />
                <div
                  className={styles.wealthBarCash}
                  style={{
                    width: `${Math.round((player.cash / maxNetWorth) * 100)}%`,
                    background: seat?.tokenColorHex ?? '#2e7d32',
                  }}
                />
              </div>
            )}
            {isExpanded && <PropertyExpanded player={player} state={state} onSpotClick={onSpotClick} onTradeWith={!isBankrupt && player.playerId !== gs.myPlayerId ? onTradeWith : undefined} />}
          </div>
        )
      })}
    </div>
  )
}
