import type { SessionState } from '../types/api'
import { SPOTS } from '../types/spots'

export interface GameEvent {
  id: number
  timestamp: number
  icon: string
  message: string
  relatedPlayerIds: string[]
}

let _id = 0

function ev(icon: string, message: string, related: string[] = []): GameEvent {
  return { id: _id++, timestamp: Date.now(), icon, message, relatedPlayerIds: related }
}

export function deriveEvents(prev: SessionState | null, next: SessionState): GameEvent[] {
  if (!prev) return []
  const events: GameEvent[] = []

  // Game over
  if (next.status === 'GAME_OVER' && prev.status !== 'GAME_OVER') {
    const winner = next.players.find(p => p.playerId === next.winnerPlayerId)
    events.push(ev('🎊', `Peli päättyi! Voittaja: ${winner?.name ?? '?'}`, []))
    return events
  }

  // Card message
  if (next.lastCardMessage && next.lastCardMessage !== prev.lastCardMessage) {
    const actorId = next.turn?.activePlayerId ?? ''
    events.push(ev('🃏', next.lastCardMessage, actorId ? [actorId] : []))
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
        events.push(ev('💰', `${np.name} ohitti GO — +€200!`, [np.playerId]))
      }
    }

    if (np.inJail && !pp.inJail) {
      events.push(ev('⛓', `${np.name} meni vankilaan`, [np.playerId]))
    }
    if (!np.inJail && pp.inJail) {
      events.push(ev('🔓', `${np.name} vapautui vankilasta`, [np.playerId]))
    }

    if ((np.bankrupt || np.eliminated) && !pp.bankrupt && !pp.eliminated) {
      events.push(ev('💀', `${np.name} meni konkurssiin`, [np.playerId]))
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
      events.push(ev('🏠', `${owner?.name ?? '?'} osti ${name}`, np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
    // Property transferred via trade
    if (np.ownerPlayerId && pp.ownerPlayerId && np.ownerPlayerId !== pp.ownerPlayerId) {
      const newOwner = next.players.find(p => p.playerId === np.ownerPlayerId)
      const prevOwner = next.players.find(p => p.playerId === pp.ownerPlayerId)
      events.push(ev('🤝', `${name}: ${prevOwner?.name ?? '?'} → ${newOwner?.name ?? '?'}`, [np.ownerPlayerId, pp.ownerPlayerId]))
    }

    if (np.mortgaged && !pp.mortgaged) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏦', `${owner?.name ?? '?'} panttasi ${name}`, np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
    if (!np.mortgaged && pp.mortgaged) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('💳', `${owner?.name ?? '?'} lunasti ${name}`, np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }

    if (np.houseCount > pp.houseCount) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏗', `${owner?.name ?? '?'} rakensi talon → ${name}`, np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
    if (np.houseCount < pp.houseCount && pp.hotelCount === 0) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏚', `${owner?.name ?? '?'} myi talon ← ${name}`, np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
    if (np.hotelCount > pp.hotelCount) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏗', `${owner?.name ?? '?'} rakensi hotellin → ${name}`, np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
    if (np.hotelCount < pp.hotelCount) {
      const owner = next.players.find(p => p.playerId === np.ownerPlayerId)
      events.push(ev('🏚', `${owner?.name ?? '?'} myi hotellin ← ${name}`, np.ownerPlayerId ? [np.ownerPlayerId] : []))
    }
  }

  // Auction ended
  if (prev.auctionState && !next.auctionState) {
    const winId = prev.auctionState.winningPlayerId
    const winner = winId ? next.players.find(p => p.playerId === winId) : null
    const spot = SPOTS.find(s => s.id === prev.auctionState!.propertyId)
    if (winner) {
      events.push(ev('🔨', `Huutokauppa: ${winner.name} voitti ${spot?.name ?? '?'}`, [winner.playerId]))
    } else {
      events.push(ev('🔨', 'Huutokauppa päättyi ilman voittajaa', []))
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
      events.push(ev('🤝', `Kauppa hyväksytty: ${initName} ↔ ${recpName}`, [initId, recpId]))
    } else if (status === 'DECLINED') {
      events.push(ev('🚫', `${recpName} hylkäsi kauppatarjouksen`, [initId, recpId]))
    } else {
      events.push(ev('🤝', `Kaupankäynti peruutettu`, [initId, recpId]))
    }
  }

  return events
}
