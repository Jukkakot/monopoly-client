import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 owns full BROWN monopoly. B2 has a hotel.
 * Sells hotel → B2 goes to 4 houses, cash +25 (€50/2).
 * (Assumes bank has enough houses to give back 4.)
 */
export const sellHotelScenario: TestScenario = {
  description: 'Selling a hotel returns half the house price and restores 4 houses',
  rules: ['SellBuildingRound on hotel → hotelCount=0, houseCount=4, cash += housePrice/2'],
  players: [
    { cash: 1500, boardIndex: 0 },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 0: ['B1', 'B2'] },
  propertyOverrides: {
    B2: { hotelCount: 1 },
  },
  turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
  expectedAfter: {
    playerCashDelta: { 0: +25 },
  },
}
