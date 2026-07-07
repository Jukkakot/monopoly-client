interface BuildingBearing {
  houseCount: number
  hotelCount: number
}

// The bank stocks a limited supply of buildings (standard Monopoly). The backend
// (DomainTurnActionGateway) rejects a build once the relevant pool is exhausted.
export const BANK_HOUSE_SUPPLY = 32
export const BANK_HOTEL_SUPPLY = 12

/**
 * Returns true when the next building on a property at `currentHouseCount` can be drawn
 * from the bank. Building the 5th house upgrades to a hotel (returns 4 houses, takes 1
 * hotel), so that step is gated by hotel supply; adding houses 1–4 is gated by house
 * supply. Mirrors the backend's bank-supply check so the UI never offers a build the
 * backend will reject with a bank-supply error.
 */
export function bankHasBuildingFor(
  currentHouseCount: number,
  allProperties: BuildingBearing[],
): boolean {
  const becomesHotel = currentHouseCount + 1 >= 5
  if (becomesHotel) {
    const totalHotels = allProperties.reduce((sum, p) => sum + p.hotelCount, 0)
    return totalHotels < BANK_HOTEL_SUPPLY
  }
  const totalHouses = allProperties.reduce((sum, p) => sum + p.houseCount, 0)
  return totalHouses < BANK_HOUSE_SUPPLY
}
