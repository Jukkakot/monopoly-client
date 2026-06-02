import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 owns full BROWN monopoly. Both B1 and B2 have 4 houses.
 * Buying one more house on B1 → hotel (houseCount=0, hotelCount=1).
 * Cost: BROWN house price = €50.
 */
export const buyHotelScenario: TestScenario = {
  description: 'Buying 5th house converts to a hotel',
  rules: ['4 houses + buy 1 → hotel (houseCount=0, hotelCount=1)'],
  players: [
    { cash: 1500, boardIndex: 0 },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 0: ['B1', 'B2'] },
  propertyOverrides: {
    B1: { houseCount: 4 },
    B2: { houseCount: 4 },
  },
  turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
  expectedAfter: {
    playerCashDelta: { 0: -50 },
  },
}
