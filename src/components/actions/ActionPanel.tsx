import { useState, useEffect, useRef } from 'react'
import styles from './ActionPanel.module.css'
import { useGame } from '../../store/GameContext'
import type { SessionState } from '../../types/api'
import { getCardText } from '../../i18n/cards'
import { useT } from '../../i18n/LanguageContext'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import { playButtonClick, playDiceRoll, playAuctionBid } from '../../utils/sounds'
import { calcNetWorth, calcCurrentRentIncome } from '../../utils/netWorth'
import { useIsAnimating } from '../../hooks/useTokenAnimation'
import { AnimatedDice } from '../common/DiceDisplay'

const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

function useTurnTimer(activeId: string | undefined, phase: string | undefined): number {
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevKey = useRef('')

  useEffect(() => {
    const key = `${activeId}:${phase}`
    if (key !== prevKey.current) {
      prevKey.current = key
      setSeconds(0)
    }
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeId, phase])

  return seconds
}

interface Props {
  state: SessionState
  myPlayerId: string
}


function Btn({ label, onClick, variant = 'primary', disabled, colorHex }: {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral' | 'info' | 'ghost'
  disabled?: boolean
  colorHex?: string
}) {
  return (
    <button className={`${styles.btn} ${styles[variant]}`} disabled={disabled}
      style={colorHex ? { borderLeftColor: colorHex, borderLeftWidth: 4, borderLeftStyle: 'solid' } : undefined}
      onClick={() => { playButtonClick(); onClick() }}>
      {label}
    </button>
  )
}


export default function ActionPanel({ state, myPlayerId }: Props) {
  const { sendCmd } = useGame()
  const t = useT()
  const sid = state.sessionId
  const turn = state.turn
  const phase = turn?.phase
  const activeId = turn?.activePlayerId
  const isMyTurn = activeId === myPlayerId
  const turnSeconds = useTurnTimer(activeId, phase)
  const tokenAnimating = useIsAnimating()

  const me = state.players.find(p => p.playerId === myPlayerId)
  const myProps = state.properties.filter(p => p.ownerPlayerId === myPlayerId)
  const hasPropActions = myProps.length > 0

  const [activeTab, setActiveTab] = useState<'action' | 'properties'>('action')

  // Auto-switch to action tab when it becomes my turn
  useEffect(() => {
    if (isMyTurn) setActiveTab('action')
  }, [isMyTurn])

  const cmd = (type: string, extra: object = {}) =>
    sendCmd({ type, sessionId: sid, actorPlayerId: myPlayerId, ...extra })

  // Track dice roll key for animation
  const [diceRollKey, setDiceRollKey] = useState(0)
  const prevDiceStrRef = useRef<string | null>(null)
  const diceStr = turn?.lastDice ? turn.lastDice.join(',') : null
  useEffect(() => {
    if (diceStr && diceStr !== prevDiceStrRef.current) {
      prevDiceStrRef.current = diceStr
      setDiceRollKey(k => k + 1)
    }
  }, [diceStr])

  // Track rent payment: record cash when my turn starts (WAITING_FOR_ROLL), detect drop on end
  const [visibleRent, setVisibleRent] = useState<{ amount: number; ownerName: string } | null>(null)
  const [rentDismissed, setRentDismissed] = useState(false)
  const cashAtRollStartRef = useRef<number | null>(null)
  const prevPhaseRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (phase === 'WAITING_FOR_ROLL' && isMyTurn) {
      cashAtRollStartRef.current = me?.cash ?? null
      setVisibleRent(null)
      setRentDismissed(false)
    }
    if (phase === 'WAITING_FOR_END_TURN' && prevPhaseRef.current === 'WAITING_FOR_ROLL' && isMyTurn) {
      const cashBefore = cashAtRollStartRef.current
      const cashNow = me?.cash ?? null
      if (cashBefore !== null && cashNow !== null && cashNow < cashBefore) {
        const myBoardIndex = me?.boardIndex
        const landedPropId = myBoardIndex !== undefined ? SPOTS[myBoardIndex]?.id : undefined
        const landedProp = landedPropId
          ? state.properties.find(p => p.propertyId === landedPropId)
          : undefined
        if (landedProp?.ownerPlayerId && landedProp.ownerPlayerId !== myPlayerId) {
          const owner = state.players.find(p => p.playerId === landedProp.ownerPlayerId)
          setVisibleRent({ amount: cashBefore - cashNow, ownerName: owner?.name ?? '?' })
        }
      }
    }
    if (activeId !== myPlayerId) {
      setVisibleRent(null)
      setRentDismissed(false)
    }
    prevPhaseRef.current = phase
  }, [phase, isMyTurn, me?.cash, me?.boardIndex, activeId, myPlayerId, state.properties, state.players])

  // Auto-advance on doubles — skip the redundant "roll again" button
  const doublesAutoAdvancedRef = useRef(false)
  useEffect(() => {
    if (!isMyTurn || phase !== 'WAITING_FOR_END_TURN') {
      doublesAutoAdvancedRef.current = false
      return
    }
    if ((turn?.consecutiveDoubles ?? 0) === 0) return
    if (tokenAnimating) return
    if (visibleRent && !rentDismissed) return
    if (doublesAutoAdvancedRef.current) return
    doublesAutoAdvancedRef.current = true
    cmd('EndTurn')
  }, [isMyTurn, phase, turn?.consecutiveDoubles, tokenAnimating, visibleRent, rentDismissed])

  function TabBar() {
    if (!hasPropActions) return null
    const mortgagedCount = myProps.filter(p => p.mortgaged).length
    return (
      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${activeTab === 'action' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('action')}>
          {t.actionTabLabel}
        </button>
        <button className={`${styles.tab} ${activeTab === 'properties' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('properties')}>
          {t.propertiesTabLabel}
          {mortgagedCount > 0 && <span className={styles.tabBadge}>{mortgagedCount}</span>}
        </button>
      </div>
    )
  }


  // SPECTATOR (no player credentials — bot-only game watcher)
  if (!myPlayerId) {
    return (
      <div className={styles.panel}>
        <div className={styles.sectionTitle}>{t.spectatorMsg}</div>
        <Btn label={t.endGameBtn} onClick={() => cmd('AbortGame')} variant="danger" />
      </div>
    )
  }

  // GAME OVER
  if (state.status === 'GAME_OVER' || phase === 'GAME_OVER') {
    const sorted = [...state.players].sort((a, b) => {
      if (a.bankrupt && !b.bankrupt) return 1
      if (!a.bankrupt && b.bankrupt) return -1
      return b.cash - a.cash
    })
    return (
      <div className={styles.panel}>
        <div className={styles.winner}>{t.gameOverTitle}</div>
        {sorted.map((p, i) => {
          const seat = state.seats.find(s => s.playerId === p.playerId)
          return (
            <div key={p.playerId} style={{ fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: seat?.tokenColorHex ?? '#888', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ fontWeight: 700 }}>{p.bankrupt ? t.bankruptLabel : `€${p.cash}`}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // Trade
  if (state.tradeState) {
    return <TradeSection state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  // While any token is moving — hold all phase-sensitive UI until arrival
  if (tokenAnimating) {
    if (!isMyTurn) {
      const activePlayer = state.players.find(p => p.playerId === activeId)
      const activeSeat = state.seats.find(s => s.playerId === activeId)
      return (
        <div className={styles.panel}>
          <div className={`${styles.infoBox} ${styles.moving}`} style={activeSeat ? { borderLeft: `4px solid ${activeSeat.tokenColorHex}` } : {}}>
            <div className={styles.movingDots}>
              <span />
              <span />
              <span />
            </div>
            {activePlayer?.name ?? '?'} …
          </div>
        </div>
      )
    }
    return (
      <div className={styles.panel}>
        <div className={`${styles.infoBox} ${styles.moving}`}>
          <div className={styles.movingDots}>
            <span />
            <span />
            <span />
          </div>
          {t.movingToken}
        </div>
      </div>
    )
  }

  // Debt
  if (state.activeDebt) {
    if (state.activeDebt.debtorPlayerId !== myPlayerId) {
      const debtorName = state.players.find(p => p.playerId === state.activeDebt!.debtorPlayerId)?.name ?? '?'
      return <div className={styles.infoBox}>{t.waitingForDebt(debtorName)}</div>
    }
    return <DebtSection state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  // Auction
  if (state.auctionState) {
    return <AuctionSection state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  // Buy decision
  if (state.pendingDecision && phase === 'WAITING_FOR_DECISION' && isMyTurn) {
    const dec = state.pendingDecision
    const p = dec.payload
    const spot = SPOTS.find(s => s.id === p.propertyId)
    const color = spot ? STREET_COLORS[spot.streetType] : undefined
    const canAfford = (me?.cash ?? 0) >= p.price
    return (
      <div className={styles.panel}>
        <TabBar />
        {activeTab === 'action' ? (
          <>
            <div className={styles.infoBox} style={color ? { borderLeft: `4px solid ${color}` } : {}}>
              📍 <strong>{spot?.name ?? p.propertyDisplayName}</strong><br />
              {t.priceLabel(p.price)}
            </div>
            {!canAfford && (
              <div className={styles.warningBox}>{t.insufficientFunds}</div>
            )}
            <Btn label={isTouchDevice ? t.buyBtn(p.price) : t.buyBtnKbd(p.price)} disabled={!canAfford} onClick={() => cmd('BuyProperty', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="primary" />
            <Btn label={isTouchDevice ? t.skipToAuction : t.skipToAuctionKbd} onClick={() => cmd('DeclineProperty', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="ghost" />
          </>
        ) : (
          <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        )}
      </div>
    )
  }

  if (!isMyTurn) {
    const activePlayer = state.players.find(p => p.playerId === activeId)
    const activeSeat = state.seats.find(s => s.playerId === activeId)
    const isAfk = turnSeconds >= 30

    // Compute turns until my turn
    const sortedSeats = [...state.seats].sort((a, b) => a.seatIndex - b.seatIndex)
    const activeIdx = sortedSeats.findIndex(s => s.playerId === activeId)
    const myIdx = sortedSeats.findIndex(s => s.playerId === myPlayerId)
    const activePlayers = state.players.filter(p => !p.bankrupt && !p.eliminated)
    let turnsUntilMine = 0
    if (activeIdx !== -1 && myIdx !== -1 && activePlayers.length > 1) {
      turnsUntilMine = (myIdx - activeIdx + sortedSeats.length) % sortedSeats.length
    }

    const myPlayer = state.players.find(p => p.playerId === myPlayerId)
    const myIncome = myPlayer ? calcCurrentRentIncome(myPlayer, state) : 0
    const myNetWorth = myPlayer ? calcNetWorth(myPlayer, state) : 0

    return (
      <div className={styles.panel}>
        <TabBar />
        {activeTab === 'action' ? (
          <>
            <div className={styles.infoBox} style={activeSeat ? { borderLeft: `4px solid ${activeSeat.tokenColorHex}` } : {}}>
              <div className={styles.turnWaiting}>
                <span>⏳ {activePlayer?.name ?? '?'} — {t.phases[phase ?? ''] ?? phase}</span>
                <span className={`${styles.turnTimer} ${isAfk ? styles.turnTimerAfk : ''}`}>
                  {turnSeconds}s{isAfk ? ' ⚠️' : ''}
                </span>
              </div>
            </div>
            {turn?.lastDice && phase === 'WAITING_FOR_END_TURN' && (
              <div className={styles.diceResult}>
                <AnimatedDice dice={turn.lastDice} rollKey={diceRollKey} size={28} showSum />
              </div>
            )}
            {phase === 'WAITING_FOR_DECISION' && state.pendingDecision && (
              <div className={styles.infoBox}>
                📍 <strong>{SPOTS.find(s => s.id === state.pendingDecision!.payload.propertyId)?.name ?? state.pendingDecision.payload.propertyDisplayName}</strong> — €{state.pendingDecision.payload.price}
              </div>
            )}
            {myPlayer && (
              <div className={styles.myStats}>
                <div className={styles.myStatRow}>
                  <span className={styles.myStatLabel}>{t.netWorthLabel}</span>
                  <span className={styles.myStatVal}>~€{myNetWorth}</span>
                </div>
                {myIncome > 0 && (
                  <div className={styles.myStatRow}>
                    <span className={styles.myStatLabel}>{t.rentalIncomeLabel}</span>
                    <span className={styles.myStatVal}>~€{myIncome}</span>
                  </div>
                )}
                {turnsUntilMine > 0 && (
                  <div className={styles.myStatRow}>
                    <span className={styles.myStatLabel}>{t.yourTurnIn(turnsUntilMine)}</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        )}
      </div>
    )
  }

  // WAITING_FOR_CARD_ACK — player must acknowledge the drawn card before effect is applied
  if (phase === 'WAITING_FOR_CARD_ACK') {
    const cardText = getCardText(state.lastCardKey ?? null, state.lastCardMessage ?? null)
    if (isMyTurn) {
      return (
        <div className={`${styles.panel} ${styles.myTurnPanel}`}>
          <div className={styles.cardPopup}>
            <span className={styles.cardPopupIcon}>🃏</span>
            <span className={styles.cardPopupText}>{cardText ?? '🃏'}</span>
            <button className={styles.cardPopupOk} onClick={() => cmd('AcknowledgeCard')}>{t.cardOkBtn}</button>
          </div>
        </div>
      )
    }
    // Not my turn — show the card the other player drew (auto-dismisses when bot acknowledges)
    const activePlayer = state.players.find(p => p.playerId === activeId)
    const activeSeat = state.seats.find(s => s.playerId === activeId)
    return (
      <div className={styles.panel}>
        <div className={`${styles.cardPopup} ${styles.cardPopupObserver}`}>
          <span className={styles.cardPopupPlayer} style={activeSeat ? { color: activeSeat.tokenColorHex } : {}}>
            {t.botDrawingCard(activePlayer?.name ?? '?')}
          </span>
          <span className={styles.cardPopupIcon}>🃏</span>
          <span className={styles.cardPopupText}>{cardText ?? '?'}</span>
        </div>
      </div>
    )
  }

  // WAITING_FOR_ROLL
  if (phase === 'WAITING_FOR_ROLL') {
    const consecutiveDoubles = turn?.consecutiveDoubles ?? 0
    return (
      <div className={`${styles.panel} ${styles.myTurnPanel}`}>
        <TabBar />
        {activeTab === 'action' ? (
          <>
            {consecutiveDoubles > 0 && turn?.lastDice && (
              <div className={styles.diceResult}>
                <AnimatedDice dice={turn.lastDice} rollKey={diceRollKey} size={32} showSum />
              </div>
            )}
            {consecutiveDoubles > 0 && (
              <div className={`${styles.infoBox} ${styles.doubles}`}>
                {t.doublesRoll}
                {consecutiveDoubles >= 2 && <span>{t.doublesWarning}</span>}
              </div>
            )}
            {me?.inJail && (
              <>
                <div className={styles.infoBox}>{t.inJail(me.jailRoundsRemaining ?? 0)}</div>
                {me.getOutOfJailCards > 0 && (
                  <Btn label={t.useJailCard(me.getOutOfJailCards)} onClick={() => cmd('UseGetOutOfJailCard')} variant="secondary" />
                )}
                {me.cash >= 50 && (
                  <Btn label={t.payJailFine} onClick={() => cmd('PayJailFine')} variant="secondary" />
                )}
              </>
            )}
            <Btn label={isTouchDevice ? t.rollDice : t.rollDiceKbd} onClick={() => { playDiceRoll(); cmd('RollDice') }} variant="primary" />
            <TradeButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
          </>
        ) : (
          <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        )}
      </div>
    )
  }

  // WAITING_FOR_END_TURN
  if (phase === 'WAITING_FOR_END_TURN') {
    const hasDoubles = (turn?.consecutiveDoubles ?? 0) > 0
    const lastDice = turn?.lastDice
    const showJailEscapeNote = !hasDoubles && !me?.inJail && lastDice?.[0] === lastDice?.[1] && lastDice?.[0] != null
    return (
      <div className={`${styles.panel} ${styles.myTurnPanel}`}>
        <TabBar />
        {activeTab === 'action' ? (
          <>
            {lastDice && (
              <div className={styles.diceResult}>
                <AnimatedDice dice={lastDice} rollKey={diceRollKey} size={32} showSum />
              </div>
            )}
            {showJailEscapeNote && (
              <div className={styles.infoBox}>{t.jailEscapeDoubles}</div>
            )}
            {visibleRent && !rentDismissed && (
              <div className={`${styles.cardPopup} ${styles.rentPopup}`}>
                <span className={styles.cardPopupIcon}>💸</span>
                <span className={styles.cardPopupText}>{t.rentPopupText(visibleRent.amount, visibleRent.ownerName)}</span>
                <button className={styles.cardPopupOk} onClick={() => setRentDismissed(true)}>{t.cardOkBtn}</button>
              </div>
            )}
            {!hasDoubles && <Btn label={isTouchDevice ? t.endTurn : t.endTurnKbd} onClick={() => cmd('EndTurn')} variant="primary" />}
            {!hasDoubles && <TradeButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />}
          </>
        ) : (
          <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        )}
      </div>
    )
  }

  return <div className={styles.panel}><div className={styles.infoBox}>{t.unknownPhase(phase ?? '')}</div></div>
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade buttons — initiate trade with another active player
// ─────────────────────────────────────────────────────────────────────────────

function TradeButtons({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const sid = state.sessionId
  const others = state.players.filter(p => p.playerId !== myPlayerId && !p.bankrupt && !p.eliminated)
  if (others.length === 0) return null

  // Single opponent: skip the picker, open trade directly
  if (others.length === 1) {
    const only = others[0]
    const seat = state.seats.find(s => s.playerId === only.playerId)
    return (
      <div className={styles.tradeSection}>
        <button className={`${styles.btn} ${styles.neutral}`}
          onClick={() => { playButtonClick(); sendCmd({ type: 'OpenTrade', sessionId: sid, actorPlayerId: myPlayerId, recipientPlayerId: only.playerId }) }}>
          {seat && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: seat.tokenColorHex, marginRight: 6, verticalAlign: 'middle' }} />}
          {t.tradeWithBtn(only.name)}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.tradeSection}>
      <button className={`${styles.btn} ${styles.neutral}`} onClick={() => { playButtonClick(); setOpen(v => !v) }}>
        {t.startTrade(open)}
      </button>
      {open && (
        <div className={styles.tradePicker}>
          {others.map(p => {
            const seat = state.seats.find(s => s.playerId === p.playerId)
            return (
              <button
                key={p.playerId}
                className={styles.tradePickerBtn}
                onClick={() => { setOpen(false); sendCmd({ type: 'OpenTrade', sessionId: sid, actorPlayerId: myPlayerId, recipientPlayerId: p.playerId }) }}
              >
                {seat && <span className={styles.tradePickerDot} style={{ background: seat.tokenColorHex }} />}
                {p.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Building buttons (build + mortgage per property, grouped by color)
// ─────────────────────────────────────────────────────────────────────────────

function BuildingButtons({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const t = useT()
  const sid = state.sessionId
  const myProps = state.properties.filter(p => p.ownerPlayerId === myPlayerId)
  const [mortgageOpen, setMortgageOpen] = useState(false)
  if (myProps.length === 0) return null

  // Find completed color groups
  const groupCounts = new Map<string, number>()
  const totalCounts = new Map<string, number>()
  for (const prop of state.properties) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot || spot.streetType === 'RAILROAD' || spot.streetType === 'UTILITY'
      || spot.streetType === 'CORNER' || spot.streetType === 'COMMUNITY'
      || spot.streetType === 'CHANCE' || spot.streetType === 'TAX') continue
    totalCounts.set(spot.streetType, (totalCounts.get(spot.streetType) ?? 0) + 1)
    if (prop.ownerPlayerId === myPlayerId)
      groupCounts.set(spot.streetType, (groupCounts.get(spot.streetType) ?? 0) + 1)
  }
  const completedGroups = new Set<string>()
  for (const [type, count] of groupCounts)
    if (count === totalCounts.get(type)) completedGroups.add(type)

  // Groups where any owned property is mortgaged — building forbidden on the whole group
  const mortgagedGroups = new Set<string>()
  for (const prop of myProps) {
    if (prop.mortgaged) {
      const spot = SPOTS.find(s => s.id === prop.propertyId)
      if (spot) mortgagedGroups.add(spot.streetType)
    }
  }

  // Only show if there are buildable props or mortgage candidates
  const buildableProps = myProps.filter(prop => {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot) return false
    return !prop.mortgaged && completedGroups.has(spot.streetType) && prop.hotelCount === 0 && !mortgagedGroups.has(spot.streetType)
  })
  const mortgageable = myProps.filter(p => !p.mortgaged && buildableProps.every(b => b.propertyId !== p.propertyId) || p.mortgaged)

  if (buildableProps.length === 0 && mortgageable.length === 0) return null

  return (
    <div className={styles.buildSection}>
      {buildableProps.length > 0 && (
        <>
          <div className={styles.sectionTitle}>{t.buildHousesSectionTitle}</div>
          {(() => {
            const groups = new Map<string, typeof buildableProps>()
            for (const prop of buildableProps) {
              const key = SPOTS.find(s => s.id === prop.propertyId)?.streetType ?? 'OTHER'
              const arr = groups.get(key) ?? []; arr.push(prop); groups.set(key, arr)
            }
            return Array.from(groups.entries()).map(([type, groupProps]) => (
              <div key={type} className={styles.buildGroup}>
                {groupProps.map(prop => {
                  const spot = SPOTS.find(s => s.id === prop.propertyId)
                  if (!spot) return null
                  const color = STREET_COLORS[spot.streetType]
                  const typeGroup = myProps.filter(p => SPOTS.find(ss => ss.id === p.propertyId)?.streetType === spot.streetType)
                  const maxLevel = Math.max(...typeGroup.map(p => p.hotelCount > 0 ? 5 : p.houseCount))
                  const myLevel = prop.hotelCount > 0 ? 5 : prop.houseCount
                  const canSell = myLevel > 0 && myLevel >= maxLevel
                  return (
                    <div key={prop.propertyId} className={styles.buildRow} style={color ? { background: color + '22' } : undefined}>
                      <span className={styles.buildName}>{spot.name}</span>
                      <div className={styles.buildHouses}>
                        {Array.from({ length: prop.houseCount }).map((_, i) => <div key={i} className={styles.houseBox} />)}
                        {Array.from({ length: 4 - prop.houseCount }).map((_, i) => <div key={i} className={styles.houseEmpty} />)}
                      </div>
                      {canSell && (
                        <button className={`${styles.buildBtn} ${styles.sellBtn}`}
                          onClick={() => sendCmd({ type: 'SellBuildingRound', sessionId: sid, actorPlayerId: myPlayerId, propertyId: prop.propertyId })}>
                          −🏠
                        </button>
                      )}
                      <button className={styles.buildBtn}
                        onClick={() => sendCmd({ type: 'BuyBuildingRound', sessionId: sid, actorPlayerId: myPlayerId, propertyId: prop.propertyId })}>
                        +🏠
                      </button>
                    </div>
                  )
                })}
              </div>
            ))
          })()}
        </>
      )}
      {myProps.length > 0 && (() => {
        const mortgageProps = myProps.filter(p => p.houseCount === 0 && p.hotelCount === 0)
        if (mortgageProps.length === 0) return null
        const mortgagedProps = mortgageProps.filter(p => p.mortgaged)
        const mortgagedCount = mortgagedProps.length
        const myCash = state.players.find(p => p.playerId === myPlayerId)?.cash ?? 0
        const totalRedeemCost = mortgagedProps.reduce((sum, prop) => {
          const spot = SPOTS.find(s => s.id === prop.propertyId)
          const mv = spot?.price ? Math.floor(spot.price / 2) : 0
          return sum + Math.ceil(mv * 1.1)
        }, 0)
        return (
          <>
            <button className={styles.sectionToggle} onClick={() => setMortgageOpen(v => !v)}>
              {t.mortgageSectionTitle}
              {mortgagedCount > 0 && <span className={styles.sectionBadge}>{mortgagedCount} pantattu</span>}
              <span className={styles.sectionChevron}>{mortgageOpen ? '▴' : '▾'}</span>
            </button>
            {mortgageOpen && (() => {
              const groups = new Map<string, typeof mortgageProps>()
              for (const prop of mortgageProps) {
                const key = SPOTS.find(s => s.id === prop.propertyId)?.streetType ?? 'OTHER'
                const arr = groups.get(key) ?? []; arr.push(prop); groups.set(key, arr)
              }
              return (
                <>
                  {mortgagedCount >= 2 && (
                    <Btn label={t.redeemAllBtn(totalRedeemCost)} variant="info"
                      disabled={myCash < totalRedeemCost}
                      onClick={() => mortgagedProps.forEach(prop =>
                        sendCmd({ type: 'ToggleMortgage', sessionId: sid, actorPlayerId: myPlayerId, propertyId: prop.propertyId }))} />
                  )}
                  {Array.from(groups.entries()).map(([type, groupProps]) => (
                    <div key={type} className={styles.buildGroup}>
                      {groupProps.map(prop => {
                        const spot = SPOTS.find(s => s.id === prop.propertyId)
                        if (!spot) return null
                        const color = STREET_COLORS[spot.streetType]
                        const mortgageVal = spot.price ? Math.floor(spot.price / 2) : null
                        const redeemCost = mortgageVal ? Math.ceil(mortgageVal * 1.1) : null
                        return (
                          <div key={prop.propertyId} className={styles.buildRow} style={color ? { background: color + '22' } : undefined}>
                            <span className={styles.buildName}>{spot.name}</span>
                            {prop.mortgaged && redeemCost && (
                              <span className={styles.mortgageVal}>€{redeemCost}</span>
                            )}
                            {!prop.mortgaged && mortgageVal && (
                              <span className={styles.mortgageVal}>+€{mortgageVal}</span>
                            )}
                            <button className={styles.buildBtn}
                              onClick={() => sendCmd({ type: 'ToggleMortgage', sessionId: sid, actorPlayerId: myPlayerId, propertyId: prop.propertyId })}>
                              {prop.mortgaged ? t.redeemBtn : t.mortgageBtn}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </>
              )
            })()}
          </>
        )
      })()}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Auction
// ─────────────────────────────────────────────────────────────────────────────

function AuctionSection({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const t = useT()
  const sid = state.sessionId
  const auction = state.auctionState!
  const [customBid, setCustomBid] = useState('')

  const spot = SPOTS.find(s => s.id === auction.propertyId)
  const minBid = auction.minimumNextBid > 0 ? auction.minimumNextBid : auction.currentBid + 10
  const isEligible = auction.eligiblePlayerIds.includes(myPlayerId) && !auction.passedPlayerIds.includes(myPlayerId)
  const currentActor = state.players.find(p => p.playerId === auction.currentActorPlayerId)
  const spotPrice = spot?.price ?? 0

  function placeBid(amount: number) {
    playAuctionBid()
    sendCmd({ type: 'PlaceAuctionBid', sessionId: sid, actorPlayerId: myPlayerId, auctionId: auction.auctionId, amount })
    setCustomBid('')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.auctionHeader}>
        <span className={styles.auctionTitle}>🔨 {spot?.name ?? auction.propertyId}</span>
        {spotPrice > 0 && <span className={styles.auctionListPriceTag}>🏷 €{spotPrice}</span>}
      </div>
      <div className={styles.auctionPlayerList}>
        {auction.eligiblePlayerIds.map(id => {
          const player = state.players.find(p => p.playerId === id)
          const seat = state.seats.find(s => s.playerId === id)
          const passed = auction.passedPlayerIds.includes(id)
          const isLeader = id === auction.leadingPlayerId
          const isActor = id === auction.currentActorPlayerId && auction.status === 'ACTIVE'
          const color = seat?.tokenColorHex ?? '#888'
          return (
            <div
              key={id}
              className={`${styles.auctionPlayerRow} ${passed ? styles.auctionPlayerRowPassed : ''} ${isLeader ? styles.auctionPlayerRowLeader : ''}`}
              style={isLeader ? { borderLeftColor: color, background: `${color}1a` } : undefined}
            >
              <div className={styles.auctionPlayerDot} style={{ background: passed ? '#ccc' : color }} />
              <span className={styles.auctionPlayerName}>{player?.name ?? '?'}</span>
              <span className={styles.auctionPlayerRight}>
                {isLeader && <span className={styles.auctionLeadBid}>€{auction.currentBid}</span>}
                {isActor && !passed && <span className={styles.auctionActorTag}>vuorossa</span>}
                {passed && <span className={styles.auctionPassTag}>passi</span>}
              </span>
            </div>
          )
        })}
      </div>
      {!isEligible && currentActor && auction.status === 'ACTIVE' && (
        <div className={styles.infoBox}>
          {t.auctionActorWaiting(currentActor.name)}
        </div>
      )}
      {auction.status === 'WON_PENDING_RESOLUTION' ? (
        <button className={`${styles.btn} ${styles.secondary}`}
          onClick={() => sendCmd({ type: 'FinishAuctionResolution', sessionId: sid, auctionId: auction.auctionId })}>
          {t.auctionConfirmWin}
        </button>
      ) : isEligible ? (
        <>
          <div className={styles.bidRow}>
            {[10, 50, 100].map(delta => (
              <button key={delta} className={styles.bidQuick}
                onClick={() => placeBid(auction.currentBid + delta)}>
                {!isTouchDevice && delta === 10 ? '+10  [↑]' : `+${delta}`}
              </button>
            ))}
          </div>
          <div className={styles.bidInput}>
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={`min €${minBid}`}
              value={customBid}
              onChange={e => setCustomBid(e.target.value)}
            />
            <button className={`${styles.btn} ${styles.info}`} style={{ width: 'auto', padding: '8px 14px' }}
              onClick={() => { const b = parseInt(customBid); if (b >= minBid) placeBid(b) }}>
              {t.placeBidBtn}
            </button>
          </div>
          <button className={`${styles.btn} ${styles.ghost}`}
            onClick={() => sendCmd({ type: 'PassAuction', sessionId: sid, actorPlayerId: myPlayerId, auctionId: auction.auctionId })}>
            {isTouchDevice ? t.passAuctionBtn : t.passAuctionBtnKbd}
          </button>
        </>
      ) : (
        <div className={styles.infoBox}>{t.waitingForOthers}</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Debt
// ─────────────────────────────────────────────────────────────────────────────

function formatDebtReason(reason: string, creditorType: string, t: ReturnType<typeof useT>): string {
  if (creditorType === 'PLAYER') return t.debtReasonRent(reason)
  if (reason === 'Tax') return t.debtReasonTax
  if (reason === 'Card repairs') return t.debtReasonRepairs
  if (reason === 'Card payment') return t.debtReasonCard
  return reason
}

function DebtSection({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const t = useT()
  const sid = state.sessionId
  const debt = state.activeDebt!
  const creditorName = debt.creditorType === 'PLAYER'
    ? state.players.find(p => p.playerId === debt.creditorPlayerId)?.name ?? t.playerCreditorLabel
    : t.bankLabel
  const reason = formatDebtReason(debt.reason, debt.creditorType, t)
  const canPay = debt.allowedActions.includes('PAY_DEBT_NOW')

  return (
    <div className={styles.panel}>
      <div className={styles.debtCard}>
        <div className={styles.debtCardHeader}>
          <span className={styles.debtCardHeaderIcon}>⚠️</span>
          <span className={styles.debtCardHeaderTitle}>{creditorName}</span>
          <span className={styles.debtCardAmount}>€{debt.amountRemaining}</span>
        </div>
        <div className={styles.debtCardBody}>
          <div className={styles.debtCardReason}>{reason}</div>
          <div className={styles.debtCardRow}>
            <span className={styles.debtCardRowLabel}>{t.debtCashLabel}</span>
            <span className={canPay ? styles.debtCardRowVal : styles.debtCardRowValRed}>€{debt.currentCash}</span>
          </div>
          {debt.estimatedLiquidationValue > 0 && (
            <div className={styles.debtCardRow}>
              <span className={styles.debtCardRowLabel}>{t.debtLiquidationLabel}</span>
              <span className={styles.debtCardRowVal}>~€{debt.estimatedLiquidationValue}</span>
            </div>
          )}
        </div>
      </div>
      {debt.allowedActions.includes('PAY_DEBT_NOW') && (
        <Btn label={t.payDebtBtn} onClick={() => sendCmd({ type: 'PayDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId })} variant="info" />
      )}
      {debt.allowedActions.includes('MORTGAGE_PROPERTY') && (() => {
        const mortgageables = state.properties
          .filter(p => p.ownerPlayerId === debt.debtorPlayerId && !p.mortgaged && p.houseCount === 0 && p.hotelCount === 0)
        if (mortgageables.length === 0) return null
        return (
          <>
            <div className={styles.debtChipLabel}>{t.debtMortgageGroupTitle}</div>
            <div className={styles.debtChipRow}>
              {mortgageables.map(prop => {
                const spot = SPOTS.find(s => s.id === prop.propertyId)
                const color = spot ? STREET_COLORS[spot.streetType] : '#888'
                const mortgageVal = spot?.price ? Math.floor(spot.price / 2) : null
                return (
                  <button key={prop.propertyId} className={styles.debtChip}
                    style={{ background: (color ?? '#888') + '30', borderColor: color ?? '#888' }}
                    onClick={() => { playButtonClick(); sendCmd({ type: 'MortgagePropertyForDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId, propertyId: prop.propertyId }) }}>
                    {spot?.name ?? prop.propertyId}{mortgageVal ? ` +€${mortgageVal}` : ''}
                  </button>
                )
              })}
            </div>
          </>
        )
      })()}
      {debt.allowedActions.includes('SELL_BUILDING') && (() => {
        const builtProps = state.properties.filter(p =>
          p.ownerPlayerId === debt.debtorPlayerId && (p.houseCount > 0 || p.hotelCount > 0))
        if (builtProps.length === 0) return null

        // Group by streetType for SellBuildingRoundsAcrossSetForDebt
        const groups = new Map<string, typeof builtProps>()
        for (const prop of builtProps) {
          const spot = SPOTS.find(s => s.id === prop.propertyId)
          const key = spot?.streetType ?? 'OTHER'
          const arr = groups.get(key) ?? []
          arr.push(prop)
          groups.set(key, arr)
        }

        return (
          <>
            <div className={styles.debtChipLabel}>{t.debtSellBuildingTitle}</div>
            <div className={styles.debtChipRow}>
              {/* Sell one round from an entire color group */}
              {Array.from(groups.entries()).filter(([, props]) => props.length > 1).map(([type, props]) => {
                const spot = SPOTS.find(s => s.id === props[0].propertyId)
                const color = STREET_COLORS[type] ?? '#888'
                const proceeds = spot?.price ? Math.floor(spot.price / 2 / 2) * props.length : null
                return (
                  <button key={`set-${props[0].propertyId}`} className={styles.debtChip}
                    style={{ background: color + '30', borderColor: color }}
                    onClick={() => { playButtonClick(); sendCmd({ type: 'SellBuildingRoundsAcrossSetForDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId, propertyId: props[0].propertyId, rounds: 1 }) }}>
                    {t.sellRoundBtn(props.length, spot?.streetType ?? '')}{proceeds ? ` +€${proceeds}` : ''}
                  </button>
                )
              })}
              {/* Sell from individual properties */}
              {builtProps.map(prop => {
                const spot = SPOTS.find(s => s.id === prop.propertyId)
                const color = spot ? (STREET_COLORS[spot.streetType] ?? '#888') : '#888'
                const proceeds = spot?.price ? Math.floor(spot.price / 2 / 2) : null
                const buildingType = prop.hotelCount > 0 ? t.hotelLabel : t.houseLabel
                return (
                  <button key={prop.propertyId} className={styles.debtChip}
                    style={{ background: color + '30', borderColor: color }}
                    onClick={() => { playButtonClick(); sendCmd({ type: 'SellBuildingForDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId, propertyId: prop.propertyId, count: 1 }) }}>
                    {t.sellBuildingBtn(buildingType, spot?.name ?? prop.propertyId)}{proceeds ? ` +€${proceeds}` : ''}
                  </button>
                )
              })}
            </div>
          </>
        )
      })()}
      {debt.allowedActions.includes('DECLARE_BANKRUPTCY') && (
        <Btn label={t.declareBankruptcy} onClick={() => sendCmd({ type: 'DeclareBankruptcy', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId })} variant="danger" />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade
// ─────────────────────────────────────────────────────────────────────────────

function TradeSection({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const t = useT()
  const sid = state.sessionId
  const trade = state.tradeState!
  const { status } = trade

  if ((status === 'EDITING' || status === 'COUNTERED') && trade.editingPlayerId === myPlayerId) {
    return <TradeEditor state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  if (status === 'SUBMITTED' && trade.decisionRequiredFromPlayerId === myPlayerId) {
    return <TradeReceiver state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  if (status === 'ACCEPTED_PENDING_APPLY') {
    return (
      <div className={styles.panel}>
        <div className={`${styles.infoBox}`}>{t.tradeApplying}</div>
      </div>
    )
  }

  const isCounterEditPhase = status === 'COUNTERED' && trade.editingPlayerId !== null && trade.editingPlayerId !== myPlayerId
  const waitingMsg = isCounterEditPhase ? t.tradeCounterEditing : t.tradeWaiting
  const canCancel = myPlayerId === trade.editingPlayerId

  return (
    <div className={styles.panel}>
      <div className={styles.infoBox}>{waitingMsg}</div>
      {canCancel && <Btn label={t.cancelOfferBtn} onClick={() => sendCmd({ type: 'CancelTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="danger" />}
    </div>
  )
}

function TradeEditor({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const t = useT()
  const sid = state.sessionId
  const trade = state.tradeState!
  const isProposer = myPlayerId === trade.initiatorPlayerId
  const partnerId = isProposer ? trade.recipientPlayerId : trade.initiatorPlayerId
  const partner = state.players.find(p => p.playerId === partnerId)
  const offer = trade.currentOffer

  // From editor's perspective:
  const myOffer = isProposer ? offer.offeredToRecipient : offer.requestedFromRecipient
  const myRequest = isProposer ? offer.requestedFromRecipient : offer.offeredToRecipient
  const myOfferSide = isProposer  // true = offeredToRecipient
  const myRequestSide = !isProposer

  // Include mortgaged but exclude properties with buildings (can't trade those)
  const myProps = state.properties.filter(p => p.ownerPlayerId === myPlayerId && p.houseCount === 0 && p.hotelCount === 0)
  const partnerProps = state.properties.filter(p => p.ownerPlayerId === partnerId && p.houseCount === 0 && p.hotelCount === 0)

  const myPlayer = state.players.find(p => p.playerId === myPlayerId)
  const partnerPlayer = state.players.find(p => p.playerId === partnerId)

  function editMoney(offeredSide: boolean, delta: number) {
    const side = offeredSide ? offer.offeredToRecipient : offer.requestedFromRecipient
    const newAmount = Math.max(0, side.moneyAmount + delta)
    sendCmd({
      type: 'EditTradeOffer', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId,
      patch: { offeredSide, replaceMoneyAmount: newAmount, propertyIdsToAdd: [], propertyIdsToRemove: [] }
    })
  }

  function toggleProp(offeredSide: boolean, propertyId: string, included: boolean) {
    sendCmd({
      type: 'EditTradeOffer', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId,
      patch: {
        offeredSide,
        propertyIdsToAdd: included ? [] : [propertyId],
        propertyIdsToRemove: included ? [propertyId] : []
      }
    })
  }

  const partnerSeat = state.seats.find(s => s.playerId === partnerId)

  const mySeat = state.seats.find(s => s.playerId === myPlayerId)

  function renderProps(props: typeof myProps, offerSide: boolean, offerData: typeof myOffer) {
    const TYPE_ORDER = ['BROWN','LIGHT_BLUE','PURPLE','ORANGE','RED','YELLOW','GREEN','DARK_BLUE','RAILROAD','UTILITY']
    const groups = new Map<string, typeof props>()
    for (const prop of props) {
      const key = SPOTS.find(s => s.id === prop.propertyId)?.streetType ?? 'OTHER'
      const arr = groups.get(key) ?? []; arr.push(prop); groups.set(key, arr)
    }
    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const ai = TYPE_ORDER.indexOf(a); const bi = TYPE_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    return sorted.map(([type, groupProps]) => {
      const color = STREET_COLORS[type]
      return (
        <div key={type} className={styles.tradePropGroup} style={color ? { borderLeft: `3px solid ${color}` } : undefined}>
          {groupProps.map(prop => {
            const spot = SPOTS.find(s => s.id === prop.propertyId)
            const included = offerData.propertyIds.includes(prop.propertyId)
            return (
              <label key={prop.propertyId}
                className={`${styles.propCheck} ${prop.mortgaged ? styles.propCheckMortgaged : ''}`}
                style={color ? { background: color + '28' } : undefined}>
                <input type="checkbox" checked={included}
                  onChange={() => toggleProp(offerSide, prop.propertyId, included)} />
                <span className={styles.propCheckName}>{spot?.name ?? prop.propertyId}</span>
                {prop.mortgaged
                  ? <span className={styles.propMortgagedTag}>{t.mortgagedInTrade}</span>
                  : spot?.price
                    ? <span className={styles.propCheckPrice}>€{spot.price}</span>
                    : null}
              </label>
            )
          })}
        </div>
      )
    })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.infoBox}>
        {t.tradeTitle(partner?.name ?? '?')}
        {partnerSeat && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill={partnerSeat.tokenColorHex} /></svg>
        </span>}
      </div>
      <div className={styles.tradeCashRow}>
        <span>{t.tradeCashLabel(myPlayer?.cash ?? 0)}</span>
        <span>{t.tradeCashLabel(partnerPlayer?.cash ?? 0)} {partner?.name?.split(' ')[0]}</span>
      </div>

      <div className={styles.tradeColumns}>
        {/* Left: what I give */}
        <div className={styles.tradeCol} style={mySeat ? { background: mySeat.tokenColorHex + '18', borderRadius: 8 } : undefined}>
          <div className={styles.tradeColTitle}>{t.youOfferLabel}</div>
          <div className={styles.tradeMoney}>
            <span>€{myOffer.moneyAmount}</span>
            <div className={styles.moneyBtns}>
              <button onClick={() => editMoney(myOfferSide, -50)} disabled={myOffer.moneyAmount < 50}>−50</button>
              <button onClick={() => editMoney(myOfferSide, -10)} disabled={myOffer.moneyAmount < 10}>−10</button>
              <button onClick={() => editMoney(myOfferSide, 10)}>+10</button>
              <button onClick={() => editMoney(myOfferSide, 50)}>+50</button>
            </div>
          </div>
          {renderProps(myProps, myOfferSide, myOffer)}
        </div>

        {/* Right: what I request */}
        <div className={styles.tradeCol} style={partnerSeat ? { background: partnerSeat.tokenColorHex + '18', borderRadius: 8 } : undefined}>
          <div className={styles.tradeColTitle}>{t.youRequestLabel}</div>
          <div className={styles.tradeMoney}>
            <span>€{myRequest.moneyAmount}</span>
            <div className={styles.moneyBtns}>
              <button onClick={() => editMoney(myRequestSide, -50)} disabled={myRequest.moneyAmount < 50}>−50</button>
              <button onClick={() => editMoney(myRequestSide, -10)} disabled={myRequest.moneyAmount < 10}>−10</button>
              <button onClick={() => editMoney(myRequestSide, 10)}>+10</button>
              <button onClick={() => editMoney(myRequestSide, 50)}>+50</button>
            </div>
          </div>
          {renderProps(partnerProps, myRequestSide, myRequest)}
        </div>
      </div>

      <Btn label={t.sendOfferBtn}
        onClick={() => sendCmd({ type: 'SubmitTradeOffer', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })}
        variant="primary" />
      <Btn label={t.cancelBtn}
        onClick={() => sendCmd({ type: 'CancelTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })}
        variant="danger" />
    </div>
  )
}

function TradeReceiver({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const t = useT()
  const sid = state.sessionId
  const trade = state.tradeState!
  const initiator = state.players.find(p => p.playerId === trade.initiatorPlayerId)
  const offer = trade.currentOffer

  function propName(id: string) {
    return SPOTS.find(s => s.id === id)?.name ?? id
  }

  return (
    <div className={styles.panel}>
      <div className={styles.infoBox}>{t.tradeOfferFrom(initiator?.name ?? '?')}</div>

      <div className={styles.offerBlock}>
        <div className={styles.offerRow}>
          <span className={styles.offerLabel}>{t.theyOfferLabel}</span>
          <div className={styles.offerItems}>
            {offer.offeredToRecipient.moneyAmount > 0 && (
              <span className={styles.offerItem}>€{offer.offeredToRecipient.moneyAmount}</span>
            )}
            {offer.offeredToRecipient.propertyIds.map(id => (
              <span key={id} className={styles.offerItem}>{propName(id)}</span>
            ))}
            {offer.offeredToRecipient.moneyAmount === 0 && offer.offeredToRecipient.propertyIds.length === 0 && (
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>—</span>
            )}
          </div>
        </div>
        <div className={styles.offerRow}>
          <span className={styles.offerLabel}>{t.theyRequestLabel}</span>
          <div className={styles.offerItems}>
            {offer.requestedFromRecipient.moneyAmount > 0 && (
              <span className={styles.offerItem}>€{offer.requestedFromRecipient.moneyAmount}</span>
            )}
            {offer.requestedFromRecipient.propertyIds.map(id => (
              <span key={id} className={styles.offerItem}>{propName(id)}</span>
            ))}
            {offer.requestedFromRecipient.moneyAmount === 0 && offer.requestedFromRecipient.propertyIds.length === 0 && (
              <span style={{ fontSize: '0.8rem', color: '#aaa' }}>—</span>
            )}
          </div>
        </div>
      </div>

      <Btn label={t.acceptBtn} onClick={() => sendCmd({ type: 'AcceptTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="primary" />
      <Btn label={t.counterOfferBtn} onClick={() => sendCmd({ type: 'CounterTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="neutral" />
      <Btn label={t.declineBtn} onClick={() => sendCmd({ type: 'DeclineTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="danger" />
    </div>
  )
}
