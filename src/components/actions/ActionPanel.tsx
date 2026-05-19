import { useState } from 'react'
import styles from './ActionPanel.module.css'
import { useGame } from '../../store/GameContext'
import type { SessionState } from '../../types/api'
import { SPOTS, STREET_COLORS } from '../../types/spots'
import OverflowMenu from '../menu/OverflowMenu'
import { playButtonClick, playDiceRoll, playAuctionBid } from '../../utils/sounds'

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

export default function ActionPanel({ state, myPlayerId }: Props) {
  const { sendCmd } = useGame()
  const sid = state.sessionId
  const turn = state.turn
  const phase = turn?.phase
  const activeId = turn?.activePlayerId
  const isMyTurn = activeId === myPlayerId

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
        <Btn label={`💰 Osta €${p.price}`} onClick={() => cmd('BuyProperty', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="primary" />
        <Btn label="🏷 Ohita → huutokauppa" onClick={() => cmd('DeclineProperty', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="ghost" />
      </div>
    )
  }

  if (!isMyTurn) {
    const activePlayer = state.players.find(p => p.playerId === activeId)
    return (
      <div className={styles.panel}>
        <div className={styles.infoBox}>
          ⏳ {activePlayer?.name ?? '?'} pelaa…
        </div>
      </div>
    )
  }

  const menu = <OverflowMenu />

  // WAITING_FOR_ROLL
  if (phase === 'WAITING_FOR_ROLL') {
    return (
      <div className={styles.panel}>
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
        <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <TradePartnerButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <Btn label="🎲 Heitä nopat" onClick={() => { playDiceRoll(); cmd('RollDice') }} variant="primary" />
        {menu}
      </div>
    )
  }

  // WAITING_FOR_END_TURN
  if (phase === 'WAITING_FOR_END_TURN') {
    return (
      <div className={styles.panel}>
        <BuildingButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <TradePartnerButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <Btn label="✅ Lopeta vuoro" onClick={() => cmd('EndTurn')} variant="primary" />
        {menu}
      </div>
    )
  }

  return <div className={styles.panel}><div className={styles.infoBox}>Tila: {phase}</div></div>
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
            return (
              <div key={prop.propertyId} className={styles.buildRow}>
                <span className={styles.buildName} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 4 }}>
                  {spot.name}
                </span>
                <div className={styles.buildHouses}>
                  {Array.from({ length: prop.houseCount }).map((_, i) => <div key={i} className={styles.houseBox} />)}
                  {Array.from({ length: 4 - prop.houseCount }).map((_, i) => <div key={i} className={styles.houseEmpty} />)}
                </div>
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
// Trade partner buttons
// ─────────────────────────────────────────────────────────────────────────────

function TradePartnerButtons({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const others = state.players.filter(p => p.playerId !== myPlayerId && !p.bankrupt && !p.eliminated)
  if (others.length === 0) return null
  return (
    <>
      <div className={styles.sectionTitle}>Kaupankäynti</div>
      {others.map(p => {
        const seat = state.seats.find(s => s.playerId === p.playerId)
        return (
          <button key={p.playerId} className={`${styles.btn} ${styles.neutral}`}
            onClick={() => sendCmd({ type: 'OpenTrade', sessionId: sid, actorPlayerId: myPlayerId, targetPlayerId: p.playerId })}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5.5" fill={seat?.tokenColorHex ?? '#888'} />
              </svg>
              🤝 Kauppa: {p.name}
            </span>
          </button>
        )
      })}
    </>
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

  function placeBid(amount: number) {
    playAuctionBid()
    sendCmd({ type: 'PlaceAuctionBid', sessionId: sid, actorPlayerId: myPlayerId, auctionId: auction.auctionId, bid: amount })
    setCustomBid('')
  }

  return (
    <div className={styles.panel}>
      <div className={`${styles.infoBox} ${styles.auction}`}>
        🔨 Huutokauppa: <strong>{spot?.name ?? auction.propertyId}</strong><br />
        Korkein: €{auction.currentBid}{leader ? ` — ${leader.name}` : ''}
      </div>
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
                +{delta}
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
            🚫 Passi
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
      {debt.allowedActions.includes('SELL_BUILDING') &&
        state.properties.filter(p => p.ownerPlayerId === debt.debtorPlayerId && (p.houseCount > 0 || p.hotelCount > 0)).map(prop => {
          const spot = SPOTS.find(s => s.id === prop.propertyId)
          const type = prop.hotelCount > 0 ? 'hotelli' : 'talo'
          return (
            <Btn key={prop.propertyId} label={`🏠 Myy ${type}: ${spot?.name ?? prop.propertyId}`}
              onClick={() => sendCmd({ type: 'SellBuildingForDebt', sessionId: sid, actorPlayerId: myPlayerId, debtId: debt.debtId, propertyId: prop.propertyId, count: 1 })}
              variant="secondary" />
          )
        })
      }
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
