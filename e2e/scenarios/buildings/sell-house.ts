import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 owns full BROWN monopoly. B2 has 2 houses, B1 has 2 houses.
 * Sells one house from B2 → B2 houseCount=1, cash +25 (€50/2).
 */
export const sellHouseScenario: TestScenario = {
  description: 'Selling a house returns half the house price',
  rules: ['SellBuildingRound → houseCount-1, cash += housePrice/2'],
  players: [
    { cash: 1500, boardIndex: 0 },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 0: ['B1', 'B2'] },
  propertyOverrides: {
    B1: { houseCount: 2 },
    B2: { houseCount: 2 },
  },
  turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
  expectedAfter: {
    playerCashDelta: { 0: +25 },
  },
}
