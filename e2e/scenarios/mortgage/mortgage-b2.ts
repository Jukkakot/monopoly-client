import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 owns only B2 (no BROWN monopoly — not needed for mortgaging).
 * Mortgaging B2 should yield cash += mortgageValue = price/2 = 60/2 = 30.
 */
export const mortgageB2Scenario: TestScenario = {
  description: 'Seat 0 mortgages B2 → cash +30, mortgaged=true',
  rules: ['mortgageValue = price / 2'],
  players: [
    { cash: 1500, boardIndex: 0 },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 0: ['B2'] },
  turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
  expectedAfter: {
    playerCashDelta: { 0: +30 },
  },
}
