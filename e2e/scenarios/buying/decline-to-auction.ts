import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 declines to buy B2 → auction starts at €10.
 * Seat 0 at 0 (GO), dice [1,2]=3 → B2. RollDice → WAITING_FOR_DECISION.
 * Then DeclineProperty → WAITING_FOR_AUCTION, minimumNextBid=10.
 */
export const declineToAuctionScenario: TestScenario = {
  description: 'Declining a property purchase starts an auction at €10',
  rules: ['DeclineProperty → WAITING_FOR_AUCTION, minimumNextBid=10'],
  players: [
    { cash: 1500, boardIndex: 0  },
    { cash: 1500, boardIndex: 10 },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: {
    phase: 'WAITING_FOR_AUCTION',
  },
}
