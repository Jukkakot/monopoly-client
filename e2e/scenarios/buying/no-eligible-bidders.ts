import type { TestScenario } from '../../helpers/scenario'

/**
 * Both players have < €10 → no eligible bidders → no auction starts.
 * After declining, property stays with bank and phase = WAITING_FOR_END_TURN.
 */
export const noEligibleBiddersScenario: TestScenario = {
  description: 'No eligible bidders → auction does not start, property stays unowned',
  rules: ['no eligible bidders → no WAITING_FOR_AUCTION, property stays bank-owned'],
  players: [
    { cash: 5, boardIndex: 0  },
    { cash: 5, boardIndex: 10 },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    propertyOwner: { B2: null },
  },
}
