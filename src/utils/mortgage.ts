import { SPOTS } from '../types/spots'

interface BuildingBearing {
  propertyId: string
  houseCount: number
  hotelCount: number
}

/**
 * Backend rule: a street cannot be **mortgaged or traded** while ANY property in its
 * color group has buildings (houses or a hotel) — every building in the group must be
 * sold first. Both TurnActionCommandHandler (mortgage) and DomainTradeGateway (trade)
 * enforce this. Railroads and utilities have no buildings, so they are never blocked
 * (a built property in the same list has a different streetType, so it never matches).
 *
 * Returns true when the action on `propertyId` would be rejected (BUILDINGS_PRESENT for
 * mortgage, invalid-offer for trade), so the UI can hide/replace it instead of offering
 * an error. This also covers the property's own buildings: a built property matches its
 * own streetType, so it reports blocked too.
 */
export function isBlockedByGroupBuildings(
  propertyId: string,
  properties: BuildingBearing[],
): boolean {
  const streetType = SPOTS.find(s => s.id === propertyId)?.streetType
  if (!streetType) return false
  return properties.some(p => {
    if (p.houseCount === 0 && p.hotelCount === 0) return false
    return SPOTS.find(s => s.id === p.propertyId)?.streetType === streetType
  })
}
