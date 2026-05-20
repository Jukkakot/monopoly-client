import type { SessionState } from '../types/api'
import { getCardText } from '../i18n/cards'
import { getLang } from '../i18n/lang'
import { translations } from '../i18n/translations'
import { SPOTS } from '../types/spots'

export interface GameEvent {
  id: number
  timestamp: number
  icon: string
  message: string
  relatedPlayerIds: string[]
  kind?: string
}

let _id = 0

function ev(icon: string, message: string, related: string[] = [], kind?: string): GameEvent {
  return { id: _id++, timestamp: Date.now(), icon, message, relatedPlayerIds: related, kind }
}

export function deriveEvents(prev: SessionState | null, next: SessionState): GameEvent[] {
  if (!prev) return []
  const events: GameEvent[] = []
  const t = translations[getLang()].ev

  // Game over
  if (next.status === 'GAME_OVER' && prev.status !== 'GAME_OVER') {
    const winner = next.players.find(p => p.playerId === next.winnerPlayerId)
    events.push(ev('🎊', t.gameOver(winner?.name ?? '?'), []))
    return events
  }

  // Card message
  if (next.lastCardKey && next.lastCardKey !== prev.lastCardKey) {
    const actorId = next.turn?.activePlayerId ?? ''
    const text = getCardText(next.lastCardKey, next.lastCardMessage)
    if (text) events.push(ev('🃏', text, actorId ? [actorId] : []))
  }

  // Per-player changes
  for (const np of next.players) {
    const pp = prev.players.find(p => p.playerId === np.playerId)
    if (!pp) continue

    if (np.boardIndex !== pp.boardIndex) {
      const spot = SPOTS[np.boardIndex]
      events.push(ev('🏃', `${np.name} → ${spot?.name ?? `#${np.boardIndex}`}`, [np.playerId]))
      // Passed GO (board index wrapped around, but didn't land on GO itself)
      if (np.boardIndex !== 0 && np.boardIndex < pp.boardIndex && !np.inJail) {
        events.push(ev('💰', t.passedGo(np.name), [np.playerId]))
      }

      // Rent paid: player moved and cash decreased, and the spot is owned by another player
      if (np.cash < pp.cash) {
        const landedProp = next.properties.find(p => p.propertyId === spot?.id)
        if (landedProp?.ownerPlayerId && landedProp.ownerPlayerId !== np.playerId) {
          const rentPaid = pp.cash - np.cash
          const owner = next.players.find(p => p.playerId === landedProp.ownerPlayerId)
          events.push(ev('💸', t.paidRent(np.name, rentPaid, owner?.name ?? '?'), [np.playerId, landedProp.ownerPlayerId]))
        }
      }
    }

    if (np.inJail && !pp.inJail) {
      events.push(ev('⛓', t.wentToJail(np.name), [np.playerId]))
    }
    if (!np.inJail && pp.inJail) {
      events.push(ev('🔓', t.releasedFromJail(np.name), [np.playerId]))
    }

    if ((np.bankrupt || np.eliminated) && !pp.bankrupt && !pp.eliminated) {
      events.push(ev('💀', t.wentBankrupt(np.name), [np.playerId]))
    }
  }

  // Property changes
  for (const np of next.properties) {
    const pp = prev.properties.find(p => p.propertyId === np.propertyId)
    if (!pp) continue
    const spot = SPOTS.find(s => s.id === np.propertyId)
    const name = spot?.name ?? np.propertyId

    if (np.ownerPlayerId && !pp.ownerPlayerId) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏠', t.bought(owner?.name ?? '?', name), np.ownerPlayerId ? [np.ownerPlayerId] : []))

      // Check if this acquisition completed a color monopoly
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
    // Property transferred via trade
    if (np.ownerPlayerId && pp.ownerPlayerId && np.ownerPlayerId !== pp.ownerPlayerId) {
      const newOwner = next.players.find(p => p.playerId === np.ownerPlayerId)
      const prevOwner = next.players.find(p => p.playerId === pp.ownerPlayerId)
      events.push(ev('🤝', t.transferred(name, prevOwner?.name ?? '?', newOwner?.name ?? '?'), [np.ownerPlayerId, pp.ownerPlayerId]))
    }

    if (np.mortgaged && !pp.mortgaged) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏦', t.mortgaged(owner?.name ?? '?', name), np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
    if (!np.mortgaged && pp.mortgaged) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('💳', t.redeemed(owner?.name ?? '?', name), np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }

    if (np.houseCount > pp.houseCount) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏗', t.builtHouse(owner?.name ?? '?', name), np.ownerPlayerId ? [np.ownerPlayerId] : [], 'house'))
    }
    if (np.houseCount < pp.houseCount && pp.hotelCount === 0) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏚', t.soldHouse(owner?.name ?? '?', name), np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
    if (np.hotelCount > pp.hotelCount) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏗', t.builtHotel(owner?.name ?? '?', name), np.ownerPlayerId ? [np.ownerPlayerId] : [], 'hotel'))
    }
    if (np.hotelCount < pp.hotelCount) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏚', t.soldHotel(owner?.name ?? '?', name), np.ownerPlayerId ? [np.ownerPlayerId] : []))
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
