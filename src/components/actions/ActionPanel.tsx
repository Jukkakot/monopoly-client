import { useState, useEffect, useRef } from 'react'
import styles from './ActionPanel.module.css'
import { useGame } from '../../store/GameContext'
import type { SessionState } from '../../types/api'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import { playButtonClick, playDiceRoll, playAuctionBid } from '../../utils/sounds'
import { calcNetWorth, calcCurrentRentIncome } from '../../utils/netWorth'
import { useIsAnimating } from '../../hooks/useTokenAnimation'

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


function Btn({ label, onClick, variant = 'primary', disabled }: {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral' | 'info' | 'ghost'
  disabled?: boolean
}) {
  return (
    <button className={`${styles.btn} ${styles[variant]}`} disabled={disabled}
      onClick={() => { playButtonClick(); onClick() }}>
      {label}
    </button>
  )
}

function DiceDisplay({ dice }: { dice: [number, number] }) {
  const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
  const total = dice[0] + dice[1]
  const isDoubles = dice[0] === dice[1]
  return (
    <div className={styles.diceRow}>
      <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{FACES[dice[0]]}</span>
      <div className={styles.diceMeta}>
        <div className={styles.diceTotal}>{total}</div>
        {isDoubles && <div className={styles.doubles}>TUPLA!</div>}
      </div>
      <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{FACES[dice[1]]}</span>
    </div>
  )
}

export default function ActionPanel({ state, myPlayerId }: Props) {
  const { sendCmd, state: ctxState } = useGame()
  const lastDice = ctxState.lastDice
  const sid = state.sessionId
  const turn = state.turn
  const phase = turn?.phase
  const activeId = turn?.activePlayerId
  const isMyTurn = activeId === myPlayerId
  const turnSeconds = useTurnTimer(activeId, phase)
  const tokenAnimating = useIsAnimating()

  const me = state.players.find(p => p.playerId === myPlayerId)

  const cmd = (type: string, extra: object = {}) =>
    sendCmd({ type, sessionId: sid, actorPlayerId: myPlayerId, ...extra })


  // GAME OVER
  if (state.status === 'GAME_OVER' || phase === 'GAME_OVER') {
    const sorted = [...state.players].sort((a, b) => {
      if (a.bankrupt && !b.bankrupt) return 1
      if (!a.bankrupt && b.bankrupt) return -1
      return b.cash - a.cash
    })
    return (
      <div className={styles.panel}>
        <div className={styles.winner}>🏆 Peli päättyi!</div>
        {sorted.map((p, i) => {
          const seat = state.seats.find(s => s.playerId === p.playerId)
          return (
            <div key={p.playerId} style={{ fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span>{['🥇','🥈','🥉'][i] ?? `${i+1}.`}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: seat?.tokenColorHex ?? '#888', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ fontWeight: 700 }}>{p.bankrupt ? 'KONKURSSI' : `€${p.cash}`}</span>
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

  // Debt
  if (state.activeDebt) {
    return <DebtSection state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  // Auction
  if (state.auctionState) {
    return <AuctionSection state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  // While token is moving — don't reveal destination yet
  if (tokenAnimating && (phase === 'WAITING_FOR_DECISION' || phase === 'WAITING_FOR_END_TURN')) {
    return (
      <div className={styles.panel}>
        <div className={`${styles.infoBox} ${styles.moving}`}>
          <div className={styles.movingDots}>
            <span />
            <span />
            <span />
          </div>
          Siirretään pelimerkki…
        </div>
      </div>
    )
  }

  // Buy decision
  if (state.pendingDecision && phase === 'WAITING_FOR_DECISION' && isMyTurn) {
    const dec = state.pendingDecision
    const p = dec.payload
    const spot = SPOTS.find(s => s.id === p.propertyId)
    const color = spot ? STREET_COLORS[spot.streetType] : undefined
    return (
      <div className={styles.panel}>
        <div className={styles.infoBox} style={color ? { borderLeft: `4px solid ${color}` } : {}}>
          📍 <strong>{p.propertyDisplayName}</strong><br />
          Hinta: €{p.price}
        </div>
        <Btn label={isTouchDevice ? `💰 Osta €${p.price}` : `💰 Osta €${p.price}  [B]`} onClick={() => cmd('BuyProperty', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="primary" />
        <Btn label={isTouchDevice ? '🏷 Ohita → huutokauppa' : '🏷 Ohita → huutokauppa  [D]'} onClick={() => cmd('DeclineProperty', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="ghost" />
        <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
      </div>
    )
  }

  if (!isMyTurn) {
    const activePlayer = state.players.find(p => p.playerId === activeId)
    const activeSeat = state.seats.find(s => s.playerId === activeId)
    const isAfk = turnSeconds >= 30

    if (tokenAnimating) {
      return (
        <div className={styles.panel}>
          <div className={`${styles.infoBox} ${styles.moving}`} style={activeSeat ? { borderLeft: `4px solid ${activeSeat.tokenColorHex}` } : {}}>
            <div className={styles.movingDots}>
              <span />
              <span />
              <span />
            </div>
            {activePlayer?.name ?? '?'} siirtyy…
          </div>
        </div>
      )
    }

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
        <div className={styles.infoBox} style={activeSeat ? { borderLeft: `4px solid ${activeSeat.tokenColorHex}` } : {}}>
          <div className={styles.turnWaiting}>
            <span>⏳ {activePlayer?.name ?? '?'} {phase === 'WAITING_FOR_ROLL' ? 'heittää nopat…' :
              phase === 'WAITING_FOR_END_TURN' ? 'lopettaa vuoroa…' :
              phase === 'WAITING_FOR_DECISION' ? 'harkitsee ostoa…' :
              phase === 'WAITING_FOR_AUCTION' ? 'huutokaupassa…' :
              phase === 'RESOLVING_DEBT' ? 'selvittää velkaa…' :
              'pelaa…'}</span>
            <span className={`${styles.turnTimer} ${isAfk ? styles.turnTimerAfk : ''}`}>
              {turnSeconds}s{isAfk ? ' ⚠️' : ''}
            </span>
          </div>
        </div>
        {phase === 'WAITING_FOR_DECISION' && state.pendingDecision && (
          <div className={styles.infoBox}>
            📍 <strong>{state.pendingDecision.payload.propertyDisplayName}</strong> — €{state.pendingDecision.payload.price}
          </div>
        )}
        {lastDice && phase === 'WAITING_FOR_END_TURN' && <DiceDisplay dice={lastDice} />}
        {state.lastCardMessage && (
          <div className={styles.cardMessage}>
            <span className={styles.cardMessageIcon}>🃏</span>
            <span>{state.lastCardMessage}</span>
          </div>
        )}
        {myPlayer && (
          <div className={styles.myStats}>
            <div className={styles.myStatRow}>
              <span className={styles.myStatLabel}>Nettovarallisuus</span>
              <span className={styles.myStatVal}>~€{myNetWorth}</span>
            </div>
            {myIncome > 0 && (
              <div className={styles.myStatRow}>
                <span className={styles.myStatLabel}>Vuokratulot/kierros</span>
                <span className={styles.myStatVal}>~€{myIncome}</span>
              </div>
            )}
            {turnsUntilMine > 0 && (
              <div className={styles.myStatRow}>
                <span className={styles.myStatLabel}>Vuorosi</span>
                <span className={styles.myStatVal}>{turnsUntilMine} pelaajan jälkeen</span>
              </div>
            )}
          </div>
        )}
        <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
      </div>
    )
  }

  // WAITING_FOR_ROLL
  if (phase === 'WAITING_FOR_ROLL') {
    const consecutiveDoubles = turn?.consecutiveDoubles ?? 0
    return (
      <div className={`${styles.panel} ${styles.myTurnPanel}`}>
        {consecutiveDoubles > 0 && (
          <div className={`${styles.infoBox} ${styles.doubles}`}>
            🎲 Tuplaheitto! Heitä uudelleen
            {consecutiveDoubles >= 2 && <span> — varoitus: 3. tupla = vankila</span>}
          </div>
        )}
        {me?.inJail && (
          <>
            <div className={styles.infoBox}>⛓ Vankilassa — {me.jailRoundsRemaining ?? '?'} kierrosta jäljellä</div>
            {me.getOutOfJailCards > 0 && (
              <Btn label={`🃏 Käytä vapautuskortti (${me.getOutOfJailCards})`} onClick={() => cmd('UseGetOutOfJailCard')} variant="secondary" />
            )}
            {me.cash >= 50 && (
              <Btn label="💸 Maksa €50 ja vapaudu" onClick={() => cmd('PayJailFine')} variant="secondary" />
            )}
          </>
        )}
        <Btn label={isTouchDevice ? '🎲 Heitä nopat' : '🎲 Heitä nopat  [välilyönti]'} onClick={() => { playDiceRoll(); cmd('RollDice') }} variant="primary" />
        <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <TradeButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
      </div>
    )
  }

  // WAITING_FOR_END_TURN
  if (phase === 'WAITING_FOR_END_TURN') {
    return (
      <div className={`${styles.panel} ${styles.myTurnPanel}`}>
        {lastDice && <DiceDisplay dice={lastDice} />}
        {state.lastCardMessage && (
          <div className={styles.cardMessage}>
            <span className={styles.cardMessageIcon}>🃏</span>
            <span>{state.lastCardMessage}</span>
          </div>
        )}
        <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <TradeButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <Btn label={isTouchDevice ? '✅ Lopeta vuoro' : '✅ Lopeta vuoro  [välilyönti]'} onClick={() => cmd('EndTurn')} variant="primary" />
      </div>
    )
  }

  return <div className={styles.panel}><div className={styles.infoBox}>Tila: {phase}</div></div>
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade buttons — initiate trade with another active player
// ─────────────────────────────────────────────────────────────────────────────

function TradeButtons({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const [open, setOpen] = useState(false)
  const sid = state.sessionId
  const others = state.players.filter(p => p.playerId !== myPlayerId && !p.bankrupt && !p.eliminated)
  if (others.length === 0) return null

  return (
    <div className={styles.tradeSection}>
      <button className={`${styles.btn} ${styles.neutral}`} onClick={() => setOpen(v => !v)}>
        🤝 Aloita kauppa {open ? '▴' : '▾'}
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
  const sid = state.sessionId
  const myProps = state.properties.filter(p => p.ownerPlayerId === myPlayerId)
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

  // Only show if there are buildable props or mortgage candidates
  const buildableProps = myProps.filter(prop => {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot) return false
    return !prop.mortgaged && completedGroups.has(spot.streetType) && prop.hotelCount === 0
  })
  const mortgageable = myProps.filter(p => !p.mortgaged && buildableProps.every(b => b.propertyId !== p.propertyId) || p.mortgaged)

  if (buildableProps.length === 0 && mortgageable.length === 0) return null

  return (
    <div className={styles.buildSection}>
      {buildableProps.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Rakenna taloja</div>
          {buildableProps.map(prop => {
            const spot = SPOTS.find(s => s.id === prop.propertyId)
            if (!spot) return null
            const color = STREET_COLORS[spot.streetType]
            // Sellable if this is the max level in the group
            const groupProps = myProps.filter(p => {
              const s = SPOTS.find(ss => ss.id === p.propertyId)
              return s?.streetType === spot.streetType
            })
            const maxLevel = Math.max(...groupProps.map(p => p.hotelCount > 0 ? 5 : p.houseCount))
            const myLevel = prop.hotelCount > 0 ? 5 : prop.houseCount
            const canSell = myLevel > 0 && myLevel >= maxLevel
            return (
              <div key={prop.propertyId} className={styles.buildRow}>
                <span className={styles.buildName} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 4 }}>
                  {spot.name}
                </span>
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
        </>
      )}
      {myProps.length > 0 && (
        <>
          <div className={styles.sectionTitle}>Kiinnitys</div>
          {myProps.filter(p => p.houseCount === 0 && p.hotelCount === 0).map(prop => {
            const spot = SPOTS.find(s => s.id === prop.propertyId)
            if (!spot) return null
            return (
              <div key={prop.propertyId} className={styles.buildRow}>
                <span className={styles.buildName}>{spot.name}</span>
                <button className={styles.buildBtn}
                  onClick={() => sendCmd({ type: 'ToggleMortgage', sessionId: sid, actorPlayerId: myPlayerId, propertyId: prop.propertyId })}>
                  {prop.mortgaged ? '💳 Lunasta' : '🏦 Panttaa'}
                </button>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Auction
// ─────────────────────────────────────────────────────────────────────────────

function AuctionSection({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const auction = state.auctionState!
  const [customBid, setCustomBid] = useState('')

  const spot = SPOTS.find(s => s.id === auction.propertyId)
  const leader = state.players.find(p => p.playerId === auction.leadingPlayerId)
  const minBid = auction.minimumNextBid > 0 ? auction.minimumNextBid : auction.currentBid + 10
  const isEligible = auction.eligiblePlayerIds.includes(myPlayerId) && !auction.passedPlayerIds.includes(myPlayerId)
  const currentActor = state.players.find(p => p.playerId === auction.currentActorPlayerId)
  const spotPrice = spot ? (SPOTS.find(s => s.id === spot.id)?.price ?? 0) : 0
  const fairBid = spotPrice > 0 ? Math.round(spotPrice * 0.85 / 10) * 10 : 0
  const isBelowFair = fairBid > 0 && auction.currentBid < fairBid

  function placeBid(amount: number) {
    playAuctionBid()
    sendCmd({ type: 'PlaceAuctionBid', sessionId: sid, actorPlayerId: myPlayerId, auctionId: auction.auctionId, amount })
    setCustomBid('')
  }

  const passedNames = auction.passedPlayerIds
    .map(id => state.players.find(p => p.playerId === id)?.name ?? '?')
  const remainingCount = auction.eligiblePlayerIds.length - auction.passedPlayerIds.length

  return (
    <div className={styles.panel}>
      <div className={`${styles.infoBox} ${styles.auction}`}>
        🔨 Huutokauppa: <strong>{spot?.name ?? auction.propertyId}</strong><br />
        Korkein: €{auction.currentBid}{leader ? ` — ${leader.name}` : ''}
      </div>
      <div className={styles.auctionProgress}>
        <div className={styles.auctionProgressBar}>
          {auction.eligiblePlayerIds.map(id => {
            const passed = auction.passedPlayerIds.includes(id)
            const seat = state.seats.find(s => s.playerId === id)
            return (
              <div
                key={id}
                className={`${styles.auctionPip} ${passed ? styles.auctionPipPassed : ''}`}
                style={{ background: passed ? '#ccc' : seat?.tokenColorHex ?? '#2e7d32' }}
                title={state.players.find(p => p.playerId === id)?.name}
              />
            )
          })}
        </div>
        <span className={styles.auctionProgressText}>
          {remainingCount > 0 ? `${remainingCount} pelaajaa jäljellä` : ''}
          {passedNames.length > 0 && ` · Passasi: ${passedNames.join(', ')}`}
        </span>
      </div>
      {isBelowFair && isEligible && (
        <div className={styles.auctionHint}>
          💡 Markkina-arvo ~€{fairBid} (85% listahinnasta)
        </div>
      )}
      {!isEligible && currentActor && auction.status === 'ACTIVE' && (
        <div className={styles.infoBox}>
          ⏳ {currentActor.name} tekee tarjouksen…
        </div>
      )}
      {auction.status === 'WON_PENDING_RESOLUTION' ? (
        <button className={`${styles.btn} ${styles.secondary}`}
          onClick={() => sendCmd({ type: 'FinishAuctionResolution', sessionId: sid, auctionId: auction.auctionId })}>
          🏆 Vahvista voitto
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
              placeholder={`min €${minBid}`}
              value={customBid}
              onChange={e => setCustomBid(e.target.value)}
            />
            <button className={`${styles.btn} ${styles.info}`} style={{ width: 'auto', padding: '8px 14px' }}
              onClick={() => { const b = parseInt(customBid); if (b >= minBid) placeBid(b) }}>
              Tarjoa
            </button>
          </div>
          <button className={`${styles.btn} ${styles.ghost}`}
            onClick={() => sendCmd({ type: 'PassAuction', sessionId: sid, actorPlayerId: myPlayerId, auctionId: auction.auctionId })}>
            {isTouchDevice ? '🚫 Passi' : '🚫 Passi  [P]'}
          </button>
        </>
      ) : (
        <div className={styles.infoBox}>⏳ Odotetaan muita pelaajia…</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Debt
// ─────────────────────────────────────────────────────────────────────────────

function DebtSection({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const debt = state.activeDebt!
  const creditorName = debt.creditorType === 'PLAYER'
    ? state.players.find(p => p.playerId === debt.creditorPlayerId)?.name ?? 'pelaaja'
    : 'Pankki'

  return (
    <div className={styles.panel}>
      <div className={`${styles.infoBox} ${styles.debt}`}>
        ⚠️ Velka €{debt.amountRemaining} → {creditorName}<br />
        Käteinen: €{debt.currentCash}
        {debt.estimatedLiquidationValue > 0 && (
          <><br />Likvidointiarvo: ~€{debt.estimatedLiquidationValue}</>
        )}
      </div>
      {debt.allowedActions.includes('PAY_DEBT_NOW') && (
        <Btn label="💸 Maksa velka" onClick={() => sendCmd({ type: 'PayDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId })} variant="info" />
      )}
      {debt.allowedActions.includes('MORTGAGE_PROPERTY') &&
        state.properties.filter(p => p.ownerPlayerId === debt.debtorPlayerId && !p.mortgaged).map(prop => {
          const spot = SPOTS.find(s => s.id === prop.propertyId)
          return (
            <Btn key={prop.propertyId} label={`🏦 Panttaa ${spot?.name ?? prop.propertyId}`}
              onClick={() => sendCmd({ type: 'MortgagePropertyForDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId, propertyId: prop.propertyId })}
              variant="secondary" />
          )
        })
      }
      {debt.allowedActions.includes('SELL_BUILDING') && (() => {
        const builtProps = state.properties.filter(p =>
          p.ownerPlayerId === debt.debtorPlayerId && (p.houseCount > 0 || p.hotelCount > 0))

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
            {/* Sell one round from an entire color group */}
            {Array.from(groups.entries()).filter(([, props]) => props.length > 1).map(([, props]) => {
              const spot = SPOTS.find(s => s.id === props[0].propertyId)
              return (
                <Btn key={`set-${props[0].propertyId}`}
                  label={`🏘 Myy kierros (${props.length} kiin.): ${spot?.streetType}`}
                  onClick={() => sendCmd({ type: 'SellBuildingRoundsAcrossSetForDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId, propertyId: props[0].propertyId, rounds: 1 })}
                  variant="secondary" />
              )
            })}
            {/* Sell from individual properties */}
            {builtProps.map(prop => {
              const spot = SPOTS.find(s => s.id === prop.propertyId)
              const type = prop.hotelCount > 0 ? 'hotelli' : 'talo'
              return (
                <Btn key={prop.propertyId} label={`🏠 Myy ${type}: ${spot?.name ?? prop.propertyId}`}
                  onClick={() => sendCmd({ type: 'SellBuildingForDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId, propertyId: prop.propertyId, count: 1 })}
                  variant="secondary" />
              )
            })}
          </>
        )
      })()}
      {debt.allowedActions.includes('DECLARE_BANKRUPTCY') && (
        <Btn label="☠ Julistaudu konkurssiin" onClick={() => sendCmd({ type: 'DeclareBankruptcy', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId })} variant="danger" />
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
  const sid = state.sessionId
  const trade = state.tradeState!
  const { status } = trade

  if (status === 'EDITING' && trade.editingPlayerId === myPlayerId) {
    return <TradeEditor state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  if ((status === 'SUBMITTED' || status === 'COUNTERED') && trade.decisionRequiredFromPlayerId === myPlayerId) {
    return <TradeReceiver state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
  }

  return (
    <div className={styles.panel}>
      <div className={styles.infoBox}>⏳ Odotetaan kaupan vastausta…</div>
      <Btn label="❌ Peruuta tarjous" onClick={() => sendCmd({ type: 'CancelTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="danger" />
    </div>
  )
}

function TradeEditor({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const trade = state.tradeState!
  const isProposer = myPlayerId === trade.initiatorPlayerId
  const partnerId = isProposer ? trade.recipientPlayerId : trade.initiatorPlayerId
  const partner = state.players.find(p => p.playerId === partnerId)
  const offer = trade.currentOffer

  // From editor's perspective:
  const myOffer   = isProposer ? offer.offeredToRecipient    : offer.requestedFromRecipient
  const myRequest = isProposer ? offer.requestedFromRecipient : offer.offeredToRecipient
  const myOfferSide   = isProposer  // true = offeredToRecipient
  const myRequestSide = !isProposer

  const myProps      = state.properties.filter(p => p.ownerPlayerId === myPlayerId && !p.mortgaged)
  const partnerProps = state.properties.filter(p => p.ownerPlayerId === partnerId && !p.mortgaged)

  function editMoney(offeredSide: boolean, delta: number) {
    const side = offeredSide ? offer.offeredToRecipient : offer.requestedFromRecipient
    const newAmount = Math.max(0, side.moneyAmount + delta)
    sendCmd({ type: 'EditTradeOffer', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId,
      patch: { offeredSide, moneyAmount: newAmount, addPropertyIds: [], removePropertyIds: [] } })
  }

  function toggleProp(offeredSide: boolean, propertyId: string, included: boolean) {
    const side = offeredSide ? offer.offeredToRecipient : offer.requestedFromRecipient
    sendCmd({ type: 'EditTradeOffer', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId,
      patch: { offeredSide, moneyAmount: side.moneyAmount,
        addPropertyIds: included ? [] : [propertyId],
        removePropertyIds: included ? [propertyId] : [] } })
  }

  const partnerSeat = state.seats.find(s => s.playerId === partnerId)

  return (
    <div className={styles.panel}>
      <div className={styles.infoBox}>
        🤝 Kauppa: {partner?.name}
        {partnerSeat && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
          <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5" fill={partnerSeat.tokenColorHex} /></svg>
        </span>}
      </div>

      <div className={styles.tradeColumns}>
        {/* Left: what I give */}
        <div className={styles.tradeCol}>
          <div className={styles.tradeColTitle}>Sinä tarjoat</div>
          <div className={styles.tradeMoney}>
            <span>€{myOffer.moneyAmount}</span>
            <div className={styles.moneyBtns}>
              <button onClick={() => editMoney(myOfferSide, -50)} disabled={myOffer.moneyAmount < 50}>−50</button>
              <button onClick={() => editMoney(myOfferSide, -10)} disabled={myOffer.moneyAmount < 10}>−10</button>
              <button onClick={() => editMoney(myOfferSide, 10)}>+10</button>
              <button onClick={() => editMoney(myOfferSide, 50)}>+50</button>
            </div>
          </div>
          {myProps.map(prop => {
            const spot = SPOTS.find(s => s.id === prop.propertyId)
            const included = myOffer.propertyIds.includes(prop.propertyId)
            return (
              <label key={prop.propertyId} className={styles.propCheck}>
                <input type="checkbox" checked={included}
                  onChange={() => toggleProp(myOfferSide, prop.propertyId, included)} />
                {spot?.name ?? prop.propertyId}
              </label>
            )
          })}
        </div>

        {/* Right: what I request */}
        <div className={styles.tradeCol}>
          <div className={styles.tradeColTitle}>Sinä pyydät</div>
          <div className={styles.tradeMoney}>
            <span>€{myRequest.moneyAmount}</span>
            <div className={styles.moneyBtns}>
              <button onClick={() => editMoney(myRequestSide, -50)} disabled={myRequest.moneyAmount < 50}>−50</button>
              <button onClick={() => editMoney(myRequestSide, -10)} disabled={myRequest.moneyAmount < 10}>−10</button>
              <button onClick={() => editMoney(myRequestSide, 10)}>+10</button>
              <button onClick={() => editMoney(myRequestSide, 50)}>+50</button>
            </div>
          </div>
          {partnerProps.map(prop => {
            const spot = SPOTS.find(s => s.id === prop.propertyId)
            const included = myRequest.propertyIds.includes(prop.propertyId)
            return (
              <label key={prop.propertyId} className={styles.propCheck}>
                <input type="checkbox" checked={included}
                  onChange={() => toggleProp(myRequestSide, prop.propertyId, included)} />
                {spot?.name ?? prop.propertyId}
              </label>
            )
          })}
        </div>
      </div>

      <Btn label="📤 Lähetä tarjous"
        onClick={() => sendCmd({ type: 'SubmitTradeOffer', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })}
        variant="primary" />
      <Btn label="❌ Peruuta"
        onClick={() => sendCmd({ type: 'CancelTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })}
        variant="danger" />
    </div>
  )
}

function TradeReceiver({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const trade = state.tradeState!
  const initiator = state.players.find(p => p.playerId === trade.initiatorPlayerId)
  const offer = trade.currentOffer

  function propName(id: string) {
    return SPOTS.find(s => s.id === id)?.name ?? id
  }

  return (
    <div className={styles.panel}>
      <div className={styles.infoBox}>🤝 Kauppatarjous — {initiator?.name}</div>

      <div className={styles.offerBlock}>
        <div className={styles.offerRow}>
          <span className={styles.offerLabel}>He tarjoavat</span>
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
          <span className={styles.offerLabel}>He pyytävät</span>
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

      <Btn label="✅ Hyväksy" onClick={() => sendCmd({ type: 'AcceptTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="primary" />
      <Btn label="💬 Vastatarjous" onClick={() => sendCmd({ type: 'CounterTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="neutral" />
      <Btn label="❌ Hylkää" onClick={() => sendCmd({ type: 'DeclineTrade', sessionId: sid, actorPlayerId: myPlayerId, tradeId: trade.tradeId })} variant="danger" />
    </div>
  )
}
