import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 has cash < €10 → ineligible to bid in auction.
 * Only seat 1 (with enough cash) appears in eligiblePlayerIds.
 */
export const ineligibleBidderScenario: TestScenario = {
  description: 'Player with < €10 is ineligible to bid in auction',
  rules: ['auction eligibility requires cash >= €10'],
  players: [
    { cash: 5,    boardIndex: 0  },  // seat 0: broke, can't afford minimum bid
    { cash: 1500, boardIndex: 10 },  // seat 1: eligible
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: {},
}
