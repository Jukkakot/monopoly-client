import styles from './ActionPanel.module.css'
import { useGame } from '../../store/GameContext'
import type { SessionState, PlayerSnapshot, PropertyStateSnapshot } from '../../types/api'
import { SPOTS } from '../../types/spots'

interface Props {
  state: SessionState
  myPlayerId: string
}

function Btn({ label, onClick, variant = 'primary' }: {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral' | 'info'
}) {
  return (
    <button className={`${styles.btn} ${styles[variant]}`} onClick={onClick}>
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
    sendCmd({ type, sessionId: sid, playerId: myPlayerId, ...extra })

  // GAME OVER
  if (state.status === 'GAME_OVER' || phase === 'GAME_OVER') {
    const winner = state.players.find(p => p.playerId === state.winnerPlayerId)
    return (
      <div className={styles.panel}>
        <div className={styles.winner}>🏆 {winner?.name ?? '?'} voitti!</div>
      </div>
    )
  }

  // Trade panel takes priority
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

  // Pending decision (buy/decline)
  if (state.pendingDecision && phase === 'WAITING_FOR_DECISION' && isMyTurn) {
    const dec = state.pendingDecision
    const p = dec.payload
    return (
      <div className={styles.panel}>
        <div className={styles.infoBox}>
          🏠 {p.propertyDisplayName} — €{p.price}
        </div>
        <Btn label="💰 Osta kiinteistö" onClick={() => cmd('BuyPropertyCommand', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="info" />
        <Btn label="🏷 Ohita → huutokauppa" onClick={() => cmd('DeclinePropertyCommand', { decisionId: dec.decisionId, propertyId: p.propertyId })} variant="secondary" />
      </div>
    )
  }

  if (!isMyTurn) {
    return (
      <div className={styles.panel}>
        <div className={styles.infoBox}>
          Odotetaan: {state.players.find(p => p.playerId === activeId)?.name ?? '?'}…
        </div>
        {/* Management buttons available even when not your turn in trade */}
      </div>
    )
  }

  // WAITING_FOR_ROLL
  if (phase === 'WAITING_FOR_ROLL') {
    return (
      <div className={styles.panel}>
        {me?.inJail && (
          <>
            <div className={styles.infoBox}>🔒 Vankilassa — {me.jailRoundsRemaining} kierrosta jäljellä</div>
            {me.getOutOfJailCards > 0 && (
              <Btn label={`🃏 Käytä vapautuskortti (${me.getOutOfJailCards})`} onClick={() => cmd('UseGetOutOfJailCardCommand')} variant="secondary" />
            )}
            {me.cash >= 50 && (
              <Btn label="💸 Maksa €50 ja vapaudu" onClick={() => cmd('PayJailFineCommand')} variant="secondary" />
            )}
          </>
        )}
        <ManagementButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <Btn label="🎲 Heitä nopat" onClick={() => cmd('RollDiceCommand')} variant="primary" />
        <TradePartnerButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
      </div>
    )
  }

  // WAITING_FOR_END_TURN
  if (phase === 'WAITING_FOR_END_TURN') {
    return (
      <div className={styles.panel}>
        <ManagementButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
        <Btn label="✅ Lopeta vuoro" onClick={() => cmd('EndTurnCommand')} variant="primary" />
        <TradePartnerButtons state={state} myPlayerId={myPlayerId} sendCmd={sendCmd} />
      </div>
    )
  }

  return <div className={styles.panel}><div className={styles.infoBox}>Tila: {phase}</div></div>
}

// -------------------------------------------------------------------------
// Management (build/mortgage)
// -------------------------------------------------------------------------

function ManagementButtons({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const myProps = state.properties.filter(p => p.ownerPlayerId === myPlayerId)
  const me = state.players.find(p => p.playerId === myPlayerId)
  if (!me) return null

  // Completed color groups
  const groupCounts = new Map<string, number>()
  const totalCounts = new Map<string, number>()
  for (const prop of state.properties) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot || spot.streetType === 'RAILROAD' || spot.streetType === 'UTILITY') continue
    totalCounts.set(spot.streetType, (totalCounts.get(spot.streetType) ?? 0) + 1)
    if (prop.ownerPlayerId === myPlayerId) {
      groupCounts.set(spot.streetType, (groupCounts.get(spot.streetType) ?? 0) + 1)
    }
  }
  const completedGroups = new Set<string>()
  for (const [type, count] of groupCounts) {
    if (count === totalCounts.get(type)) completedGroups.add(type)
  }

  const buttons: JSX.Element[] = []

  for (const prop of myProps) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot) continue

    // Build
    if (!prop.mortgaged && spot.streetType !== 'RAILROAD' && spot.streetType !== 'UTILITY'
        && spot.streetType !== 'CORNER' && spot.streetType !== 'COMMUNITY'
        && spot.streetType !== 'CHANCE' && spot.streetType !== 'TAX'
        && completedGroups.has(spot.streetType) && prop.hotelCount === 0) {
      buttons.push(
        <button key={`build-${prop.propertyId}`} className={`${styles.btn} ${styles.info}`}
          onClick={() => sendCmd({ type: 'BuyBuildingRoundCommand', sessionId: sid, playerId: myPlayerId, propertyId: prop.propertyId })}>
          🏠 Rakenna: {spot.name} ({prop.houseCount})
        </button>
      )
    }

    // Mortgage / redeem (max 6)
    if (buttons.length < 8) {
      const label = prop.mortgaged ? `💰 Lunasta ${spot.name}` : `📜 Kiinnitä ${spot.name}`
      const variant = prop.mortgaged ? 'neutral' : 'secondary'
      buttons.push(
        <button key={`mort-${prop.propertyId}`} className={`${styles.btn} ${styles[variant]}`}
          onClick={() => sendCmd({ type: 'ToggleMortgageCommand', sessionId: sid, playerId: myPlayerId, propertyId: prop.propertyId })}>
          {label}
        </button>
      )
    }
  }

  return <>{buttons}</>
}

// -------------------------------------------------------------------------
// Trade partner buttons
// -------------------------------------------------------------------------

function TradePartnerButtons({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const others = state.players.filter(p => p.playerId !== myPlayerId && !p.bankrupt && !p.eliminated)
  if (others.length === 0) return null
  return (
    <>
      <div className={styles.sectionTitle}>Kaupankäynti</div>
      {others.map(p => (
        <button key={p.playerId} className={`${styles.btn} ${styles.neutral}`}
          onClick={() => sendCmd({ type: 'OpenTradeCommand', sessionId: sid, playerId: myPlayerId, targetPlayerId: p.playerId })}>
          🤝 Kauppa: {p.name}
        </button>
      ))}
    </>
  )
}

// -------------------------------------------------------------------------
// Auction
// -------------------------------------------------------------------------

function AuctionSection({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const auction = state.auctionState!
  const spot = SPOTS.find(s => s.id === auction.propertyId)
  const leader = state.players.find(p => p.playerId === auction.leadingPlayerId)
  const nextBid = auction.minimumNextBid > 0 ? auction.minimumNextBid : auction.currentBid + 10

  return (
    <div className={styles.panel}>
      <div className={`${styles.infoBox} ${styles.auction}`}>
        🏠 {spot?.name ?? auction.propertyId} — korkein tarjous: €{auction.currentBid}
        {leader && <div>Johtaa: {leader.name}</div>}
      </div>
      {auction.status === 'WON_PENDING_RESOLUTION' ? (
        <button className={`${styles.btn} ${styles.secondary}`}
          onClick={() => sendCmd({ type: 'FinishAuctionResolutionCommand', sessionId: sid, auctionId: auction.auctionId })}>
          🏆 Vahvista voitto
        </button>
      ) : (
        <>
          <button className={`${styles.btn} ${styles.info}`}
            onClick={() => sendCmd({ type: 'PlaceAuctionBidCommand', sessionId: sid, playerId: myPlayerId, auctionId: auction.auctionId, bid: nextBid })}>
            📢 Huuto €{nextBid}
          </button>
          <button className={`${styles.btn} ${styles.neutral}`}
            onClick={() => sendCmd({ type: 'PassAuctionCommand', sessionId: sid, playerId: myPlayerId, auctionId: auction.auctionId })}>
            🚫 Passi
          </button>
        </>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------
// Debt
// -------------------------------------------------------------------------

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
        💸 Velka €{debt.amountRemaining} → {creditorName}<br />
        Käteinen: €{debt.currentCash}
      </div>
      {debt.allowedActions.includes('PAY_DEBT_NOW') && (
        <button className={`${styles.btn} ${styles.info}`}
          onClick={() => sendCmd({ type: 'PayDebtCommand', sessionId: sid, playerId: myPlayerId, debtId: debt.debtId })}>
          💸 Maksa velka
        </button>
      )}
      {debt.allowedActions.includes('MORTGAGE_PROPERTY') &&
        state.properties.filter(p => p.ownerPlayerId === debt.debtorPlayerId && !p.mortgaged).map(prop => {
          const spot = SPOTS.find(s => s.id === prop.propertyId)
          return (
            <button key={prop.propertyId} className={`${styles.btn} ${styles.secondary}`}
              onClick={() => sendCmd({ type: 'MortgagePropertyForDebtCommand', sessionId: sid, playerId: myPlayerId, debtId: debt.debtId, propertyId: prop.propertyId })}>
              📜 Kiinnitä {spot?.name ?? prop.propertyId}
            </button>
          )
        })
      }
      {debt.allowedActions.includes('SELL_BUILDING') &&
        state.properties.filter(p => p.ownerPlayerId === debt.debtorPlayerId && (p.houseCount > 0 || p.hotelCount > 0)).map(prop => {
          const spot = SPOTS.find(s => s.id === prop.propertyId)
          const type = prop.hotelCount > 0 ? 'hotelli' : 'talo'
          return (
            <button key={prop.propertyId} className={`${styles.btn} ${styles.secondary}`}
              onClick={() => sendCmd({ type: 'SellBuildingForDebtCommand', sessionId: sid, playerId: myPlayerId, debtId: debt.debtId, propertyId: prop.propertyId, count: 1 })}>
              🏠 Myy {type}: {spot?.name ?? prop.propertyId}
            </button>
          )
        })
      }
      {debt.allowedActions.includes('DECLARE_BANKRUPTCY') && (
        <button className={`${styles.btn} ${styles.danger}`}
          onClick={() => sendCmd({ type: 'DeclareBankruptcyCommand', sessionId: sid, playerId: myPlayerId, debtId: debt.debtId })}>
          ☠ Konkurssi
        </button>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------
// Trade
// -------------------------------------------------------------------------

function TradeSection({ state, myPlayerId, sendCmd }: {
  state: SessionState; myPlayerId: string; sendCmd: (c: object) => void
}) {
  const sid = state.sessionId
  const trade = state.tradeState!
  const { status } = trade

  if (status === 'EDITING' && trade.editingPlayerId === myPlayerId) {
    const isProposer = myPlayerId === trade.initiatorPlayerId
    const partnerId = isProposer ? trade.recipientPlayerId : trade.initiatorPlayerId
    const partner = state.players.find(p => p.playerId === partnerId)
    const offer = trade.currentOffer
    const myGive = isProposer ? offer.offeredToRecipient : offer.requestedFromRecipient

    return (
      <div className={styles.panel}>
        <div className={styles.infoBox}>🤝 Kauppa: {partner?.name}</div>
        <div className={styles.sectionTitle}>Annan: €{myGive.moneyAmount}</div>
        <button className={`${styles.btn} ${styles.neutral}`}
          onClick={() => sendCmd({ type: 'EditTradeOfferCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId, patch: { offeredSide: isProposer, moneyAmount: myGive.moneyAmount + 10, addPropertyIds: [], removePropertyIds: [] } })}>
          +€10
        </button>
        {myGive.moneyAmount >= 10 && (
          <button className={`${styles.btn} ${styles.neutral}`}
            onClick={() => sendCmd({ type: 'EditTradeOfferCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId, patch: { offeredSide: isProposer, moneyAmount: myGive.moneyAmount - 10, addPropertyIds: [], removePropertyIds: [] } })}>
            -€10
          </button>
        )}
        <button className={`${styles.btn} ${styles.primary}`}
          onClick={() => sendCmd({ type: 'SubmitTradeOfferCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId })}>
          📤 Lähetä tarjous
        </button>
        <button className={`${styles.btn} ${styles.danger}`}
          onClick={() => sendCmd({ type: 'CancelTradeCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId })}>
          ❌ Peruuta
        </button>
      </div>
    )
  }

  if ((status === 'SUBMITTED' || status === 'COUNTERED') && trade.decisionRequiredFromPlayerId === myPlayerId) {
    return (
      <div className={styles.panel}>
        <div className={styles.infoBox}>🤝 Tarjous saapui</div>
        <button className={`${styles.btn} ${styles.primary}`}
          onClick={() => sendCmd({ type: 'AcceptTradeCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId })}>
          ✅ Hyväksy
        </button>
        <button className={`${styles.btn} ${styles.neutral}`}
          onClick={() => sendCmd({ type: 'CounterTradeCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId })}>
          💬 Vastatarjous
        </button>
        <button className={`${styles.btn} ${styles.danger}`}
          onClick={() => sendCmd({ type: 'DeclineTradeCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId })}>
          ❌ Hylkää
        </button>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.infoBox}>⏳ Odotetaan kaupan vastausta…</div>
      <button className={`${styles.btn} ${styles.danger}`}
        onClick={() => sendCmd({ type: 'CancelTradeCommand', sessionId: sid, playerId: myPlayerId, tradeId: trade.tradeId })}>
        ❌ Peruuta tarjous
      </button>
    </div>
  )
}
