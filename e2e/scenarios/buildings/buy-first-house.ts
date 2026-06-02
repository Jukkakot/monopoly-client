import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 owns full BROWN monopoly (B1+B2), both with 0 houses.
 * Buys first house on B1 during WAITING_FOR_END_TURN.
 * BROWN house price = €50, half back on sell.
 */
export const buyFirstHouseScenario: TestScenario = {
  description: 'Buying first house on a property costs the house price',
  rules: ['BuyBuildingRound on monopoly property → houseCount+1, cash -= housePrice'],
  players: [
    { cash: 1500, boardIndex: 0 },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 0: ['B1', 'B2'] },
  turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
  expectedAfter: {
    playerCashDelta: { 0: -50 },
  },
}
