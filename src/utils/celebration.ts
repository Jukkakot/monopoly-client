import type { GameEvent } from '../store/events'
import type { SessionState } from '../types/api'
import type { T } from '../i18n/translations'
import { SPOTS, STREET_COLORS } from '../types/spots'

export interface CelebrationData {
  /** Monotonic id — one per celebration; drives the auto-dismiss timers. */
  id: number
  icon: string
  title: string
  subtitle?: string
  /** Optional price/amount line, e.g. "€100". */
  price?: string
  /** Accent colour for the rays, card glow and swatch. */
  accentColor: string
  /** Optional attributed player (the monopoly celebration fires for anyone). */
  playerName?: string
  playerColor?: string
}

const GREEN = '#2e7d32'

/** Only rents at or above this land a celebration — small base rents would be spammy. */
export const BIG_RENT_MIN = 200

function spotColor(propertyId?: string): string {
  const st = propertyId ? SPOTS.find(s => s.id === propertyId)?.streetType : undefined
  return (st && STREET_COLORS[st]) || GREEN
}
function spotName(propertyId?: string): string {
  return propertyId ? (SPOTS.find(s => s.id === propertyId)?.name ?? propertyId) : ''
}
function spotPrice(propertyId?: string): number | undefined {
  return propertyId ? SPOTS.find(s => s.id === propertyId)?.price : undefined
}

/**
 * Picks the single most important milestone celebration to show from a batch of freshly
 * received events. Priority: a completed monopoly (for ANY player) outranks the local
 * player's own auction win, hotel, then purchase. The personal milestones fire only for
 * `myPlayerId` — never for other players' purchases/auctions/hotels. Returns null when
 * nothing in the batch is celebration-worthy.
 */
export function pickCelebration(
  freshEvents: GameEvent[],
  state: SessionState,
  myPlayerId: string | null,
  t: T,
): CelebrationData | null {
  // 1. Monopoly completed — any player. Take the last one in the batch.
  const mono = [...freshEvents].reverse().find(e => e.kind === 'monopoly')
  if (mono) {
    const owner = state.players.find(p => p.playerId === mono.relatedPlayerIds[0])
    const seat = owner ? state.seats.find(s => s.playerId === owner.playerId) : undefined
    const groupName = mono.group ? (t.streetTypeNames[mono.group] ?? mono.group) : ''
    return {
      id: mono.id, icon: '🏆', title: t.monopolyCelebrationTitle,
      subtitle: t.monopolyCelebrationSub(groupName),
      accentColor: (mono.group && STREET_COLORS[mono.group]) || GREEN,
      playerName: owner?.name, playerColor: seat?.tokenColorHex,
    }
  }

  if (!myPlayerId) return null
  const mine = (e: GameEvent) => e.relatedPlayerIds[0] === myPlayerId

  // 2. Auction won by me.
  const auction = [...freshEvents].reverse().find(e => e.soundKey === 'AUCTION_WON' && mine(e))
  if (auction) return {
    id: auction.id, icon: '🔨', title: t.celebAuctionWonTitle,
    subtitle: spotName(auction.propertyId), accentColor: spotColor(auction.propertyId),
  }

  // 3. Hotel built by me.
  const hotel = [...freshEvents].reverse().find(e => e.soundKey === 'BUILT_HOTEL' && mine(e))
  if (hotel) return {
    id: hotel.id, icon: '🏨', title: t.celebHotelTitle,
    subtitle: spotName(hotel.propertyId), accentColor: spotColor(hotel.propertyId),
  }

  // 4. Property bought by me.
  const buy = [...freshEvents].reverse().find(e => e.soundKey === 'BOUGHT_PROPERTY' && mine(e))
  if (buy) {
    const price = spotPrice(buy.propertyId)
    return {
      id: buy.id, icon: '🏠', title: t.celebBoughtTitle,
      subtitle: spotName(buy.propertyId), price: price ? `€${price}` : undefined,
      accentColor: spotColor(buy.propertyId),
    }
  }

  // 5. A big rent paid TO me (I'm the creditor = relatedPlayerIds[1]).
  const rent = [...freshEvents].reverse().find(e =>
    e.soundKey === 'PAID_RENT' && e.relatedPlayerIds[1] === myPlayerId && (e.amount ?? 0) >= BIG_RENT_MIN)
  if (rent) {
    const payer = state.players.find(p => p.playerId === rent.relatedPlayerIds[0])
    return {
      id: rent.id, icon: '💰', title: t.celebBigRentTitle,
      subtitle: payer?.name, price: `€${rent.amount}`, accentColor: GREEN,
    }
  }

  return null
}
