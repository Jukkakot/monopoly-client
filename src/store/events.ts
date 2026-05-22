import type { GameEventEntry, SessionState } from '../types/api'
import type { PlayerSnapshot } from '../types/api'
import { getCardText } from '../i18n/cards'
import { getLang } from '../i18n/lang'
import { translations } from '../i18n/translations'
import { SPOTS } from '../types/spots'

// Must stay in sync with useTokenAnimation.ts
const STEP_MS = 390
const BOARD_SIZE = 40
const JAIL_INDEX = 10

export interface GameEvent {
  id: number
  timestamp: number
  icon: string
  message: string
  relatedPlayerIds: string[]
  kind?: string
  releaseAt?: number  // hide in event log until this timestamp
  historical?: boolean  // loaded from existing log on reconnect/refresh — no sounds
}

let _id = 0

function ev(icon: string, message: string, related: string[] = [], kind?: string, delay = 0): GameEvent {
  const now = Date.now()
  return { id: _id++, timestamp: now, icon, message, relatedPlayerIds: related, kind, releaseAt: delay > 0 ? now + delay : undefined }
}

function moveDelay(fromIdx: number, toIdx: number, goingToJail: boolean): number {
  if (goingToJail) {
    const dist = (JAIL_INDEX - fromIdx + BOARD_SIZE) % BOARD_SIZE
    return Math.max(600, Math.min(2000, 600 + (dist / 39) * 1400))
  }
  const steps = (toIdx - fromIdx + BOARD_SIZE) % BOARD_SIZE
  return steps * STEP_MS
}

/**
 * Translate backend-persisted GameEventEntry records into display events.
 * Call with only the NEW entries (id > lastSeenEventId).
 */
export function translateBackendEvents(entries: GameEventEntry[], players: PlayerSnapshot[]): GameEvent[] {
  const t = translations[getLang()].ev
  const events: GameEvent[] = []
  // Tracks last movement delay per player so subsequent events appear after animation
  const playerDelayMs = new Map<string, number>()

  for (const e of entries) {
    const pid = e.playerIds[0] ?? ''
    const pid2 = e.playerIds[1] ?? ''
    const player = players.find(p => p.playerId === pid)
    const name = player?.name ?? pid

    switch (e.type) {
      case 'DICE_ROLLED': {
        const d1 = parseInt(e.data.d1 ?? '1')
        const d2 = parseInt(e.data.d2 ?? '1')
        events.push(ev('🎲', t.rolledDice(name, d1, d2), [pid], `${d1}_${d2}`))
        break
      }
      case 'PLAYER_MOVED': {
        const from = parseInt(e.data.from ?? '0')
        const to = parseInt(e.data.to ?? '0')
        const delay = moveDelay(from, to, false)
        playerDelayMs.set(pid, delay)
        const spot = SPOTS[to]
        events.push(ev('🏃', `${name} → ${spot?.name ?? `#${to}`}`, [pid], undefined, delay))
        break
      }
      case 'PASSED_GO': {
        const delay = playerDelayMs.get(pid) ?? 0
        events.push(ev('💰', t.passedGo(name), [pid], undefined, delay))
        break
      }
      case 'WENT_TO_JAIL': {
        const from = e.data.from != null ? parseInt(e.data.from) : null
        const delay = from != null ? moveDelay(from, JAIL_INDEX, true) : (playerDelayMs.get(pid) ?? 0)
        playerDelayMs.set(pid, delay)
        events.push(ev('⛓', t.wentToJail(name), [pid], undefined, delay))
        break
      }
      case 'RELEASED_FROM_JAIL': {
        events.push(ev('🔓', t.releasedFromJail(name), [pid]))
        break
      }
      case 'DREW_CARD': {
        const cardKey = e.data.card ?? ''
        const text = getCardText(cardKey, null)
        const delay = playerDelayMs.get(pid) ?? 0
        if (text) events.push(ev('🃏', t.drewCard(name, text), [pid], undefined, delay))
        break
      }
      case 'PAID_RENT': {
        const creditor = players.find(p => p.playerId === pid2)
        const amount = parseInt(e.data.amount ?? '0')
        const delay = playerDelayMs.get(pid) ?? 0
        events.push(ev('💸', t.paidRent(name, amount, creditor?.name ?? '?'), e.playerIds.slice(0, 2), undefined, delay))
        break
      }
      case 'BOUGHT_PROPERTY': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        const propName = spot?.name ?? e.data.property ?? '?'
        const delay = playerDelayMs.get(pid) ?? 0
        events.push(ev('🏠', t.bought(name, propName), [pid], undefined, delay))
        break
      }
      case 'BUILT_HOUSE': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏗', t.builtHouse(name, spot?.name ?? e.data.property ?? '?'), [pid], `house:${spot?.streetType ?? ''}`))
        break
      }
      case 'BUILT_HOTEL': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏗', t.builtHotel(name, spot?.name ?? e.data.property ?? '?'), [pid], `hotel:${spot?.streetType ?? ''}`))
        break
      }
      case 'SOLD_HOUSE': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏚', t.soldHouse(name, spot?.name ?? e.data.property ?? '?'), [pid], `sell:${spot?.streetType ?? ''}`))
        break
      }
      case 'SOLD_HOTEL': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏚', t.soldHotel(name, spot?.name ?? e.data.property ?? '?'), [pid], `sellhotel:${spot?.streetType ?? ''}`))
        break
      }
      case 'MORTGAGED': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('🏦', t.mortgaged(name, spot?.name ?? e.data.property ?? '?'), [pid]))
        break
      }
      case 'REDEEMED': {
        const spot = SPOTS.find(s => s.id === e.data.property)
        events.push(ev('💳', t.redeemed(name, spot?.name ?? e.data.property ?? '?'), [pid]))
        break
      }
      case 'WENT_BANKRUPT': {
        events.push(ev('💀', t.wentBankrupt(name), [pid]))
        break
      }
    }
  }

  return events
}

/**
 * Derive events that aren't tracked in the backend event log:
 * game over, monopoly gains, auction results, trade results, property transfers.
 */
export function deriveMiscEvents(prev: SessionState | null, next: SessionState): GameEvent[] {
  if (!prev) return []
  const events: GameEvent[] = []
  const t = translations[getLang()].ev

  // Game over
  if (next.status === 'GAME_OVER' && prev.status !== 'GAME_OVER') {
    const winner = next.players.find(p => p.playerId === next.winnerPlayerId)
    events.push(ev('🎊', t.gameOver(winner?.name ?? '?'), []))
    return events
  }

  // Monopoly gained (property purchase completing a color set)
  for (const np of next.properties) {
    const pp = prev.properties.find(p => p.propertyId === np.propertyId)
    if (!pp) continue

    if (np.ownerPlayerId && !pp.ownerPlayerId) {
      const spot = SPOTS.find(s => s.id === np.propertyId)
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      if (spot && owner && !['RAILROAD', 'UTILITY', 'CORNER', 'COMMUNITY', 'CHANCE', 'TAX'].includes(spot.streetType)) {
        const groupProps = next.properties.filter(p => {
          const s = SPOTS.find(ss => ss.id === p.propertyId)
          return s?.streetType === spot.streetType
        })
        const ownerGroupCount = groupProps.filter(p => p.ownerPlayerId === owner.playerId).length
        if (ownerGroupCount === groupProps.length) {
          events.push(ev('🏆', t.gotMonopoly(owner.name, spot.streetType), [owner.playerId]))
        }
      }
    }

    // Property transferred (bankruptcy)
    if (np.ownerPlayerId && pp.ownerPlayerId && np.ownerPlayerId !== pp.ownerPlayerId) {
      const newOwner = next.players.find(p => p.playerId === np.ownerPlayerId)
      const prevOwner = next.players.find(p => p.playerId === pp.ownerPlayerId)
      const spot = SPOTS.find(s => s.id === np.propertyId)
      events.push(ev('🤝', t.transferred(spot?.name ?? np.propertyId, prevOwner?.name ?? '?', newOwner?.name ?? '?'),
        [np.ownerPlayerId, pp.ownerPlayerId]))
    }
  }

  // Auction ended
  if (prev.auctionState && !next.auctionState) {
    const winId = prev.auctionState.winningPlayerId
    const winner = winId ? next.players.find(p => p.playerId === winId) : null
    const spot = SPOTS.find(s => s.id === prev.auctionState!.propertyId)
    if (winner) {
      events.push(ev('🔨', t.auctionWon(winner.name, spot?.name ?? '?'), [winner.playerId]))
    } else {
      events.push(ev('🔨', t.auctionNoWinner, []))
    }
  }

  // Trade ended
  if (prev.tradeState && !next.tradeState) {
    const initId = prev.tradeState.initiatorPlayerId
    const recpId = prev.tradeState.recipientPlayerId
    const initName = next.players.find(p => p.playerId === initId)?.name ?? '?'
    const recpName = next.players.find(p => p.playerId === recpId)?.name ?? '?'
    const status = prev.tradeState.status
    if (status === 'ACCEPTED_PENDING_APPLY') {
      events.push(ev('🤝', t.tradeAccepted(initName, recpName), [initId, recpId], 'accepted'))
    } else if (status === 'DECLINED') {
      events.push(ev('🚫', t.tradeDeclined(recpName), [initId, recpId]))
    } else {
      events.push(ev('🤝', t.tradeCancelled, [initId, recpId]))
    }
  }

  return events
}
