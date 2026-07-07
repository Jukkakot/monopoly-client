import { SPOTS } from '../types/spots'

interface BuildingBearing {
  propertyId: string
  houseCount: number
  hotelCount: number
}

/**
 * Backend rule (TurnActionCommandHandler): a street cannot be mortgaged while ANY
 * property in its color group has buildings (houses or a hotel) — every building in
 * the group must be sold first. Railroads and utilities have no buildings, so they
 * are never blocked (a built property in the same list would have a different
 * streetType, so it never matches).
 *
 * Returns true when mortgaging `propertyId` would be rejected with BUILDINGS_PRESENT,
 * so the UI can hide/replace the mortgage action instead of offering an error.
 *
 * This also covers the property's own buildings: a built property matches its own
 * streetType, so it reports blocked too.
 */
export function isMortgageBlockedByGroupBuildings(
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
