import type { PlayerSnapshot, SessionState } from '../types/api'
import { SPOTS } from '../types/spots'
import { RENT_TABLE, GROUP_SIZE } from '../types/rents'

const HOUSE_COST: Record<string, number> = {
  BROWN: 50, LIGHT_BLUE: 50, PURPLE: 100, ORANGE: 100,
  RED: 150, YELLOW: 150, GREEN: 200, DARK_BLUE: 200,
}

export function calcNetWorth(player: PlayerSnapshot, state: SessionState): number {
  let total = player.cash
  for (const propId of player.ownedPropertyIds) {
    const prop = state.properties.find(p => p.propertyId === propId)
    const spot = SPOTS.find(s => s.id === propId)
    if (!prop || !spot?.price) continue
    total += prop.mortgaged ? Math.floor(spot.price / 2) : spot.price
    const houseCost = HOUSE_COST[spot.streetType] ?? 0
    total += prop.houseCount * houseCost + prop.hotelCount * houseCost * 5
  }
  return total
}

export function calcCurrentRentIncome(player: PlayerSnapshot, state: SessionState): number {
  let total = 0
  const myProps = state.properties.filter(p => p.ownerPlayerId === player.playerId && !p.mortgaged)

  for (const prop of myProps) {
    const spot = SPOTS.find(s => s.id === prop.propertyId)
    if (!spot) continue
    const rents = RENT_TABLE[prop.propertyId] ?? []
    const groupTotal = GROUP_SIZE[spot.streetType] ?? 0

    if (spot.streetType === 'RAILROAD') {
      const rrOwned = myProps.filter(p => SPOTS.find(s => s.id === p.propertyId)?.streetType === 'RAILROAD').length
      total += rents[Math.min(rrOwned - 1, rents.length - 1)] ?? 0
    } else if (spot.streetType !== 'UTILITY' && rents.length >= 6) {
      // Monopoly doubling follows OWNERSHIP (the backend rule): a mortgaged member still
      // counts toward the set, so count from all owned properties, not only unmortgaged ones.
      const ownerGroupCount = state.properties.filter(p =>
        p.ownerPlayerId === player.playerId &&
        SPOTS.find(s => s.id === p.propertyId)?.streetType === spot.streetType).length
      const isMonopoly = ownerGroupCount === groupTotal
      const level = prop.hotelCount > 0 ? 5 : prop.houseCount
      total += level === 0 && isMonopoly ? rents[0] * 2 : rents[level] ?? 0
    }
  }
  return total
}
