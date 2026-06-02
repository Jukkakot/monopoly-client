import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 1 owns B2 (mortgaged). Landing on a mortgaged property charges no rent.
 * Seat 0 at 0 (GO), dice [1,2]=3 → B2 (position 3). No GO crossing.
 */
export const rentMortgagedScenario: TestScenario = {
  description: 'Landing on mortgaged property charges no rent',
  rules: ['mortgaged property → rent = 0'],
  players: [
    { cash: 1500, boardIndex: 0  },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 1: ['B2'] },
  propertyOverrides: { B2: { mortgaged: true } },
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: {},  // no cash change for either player
  },
}
