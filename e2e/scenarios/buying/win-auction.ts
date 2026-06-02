import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 declines B2 → auction. One player bids €10, other passes → winner owns B2.
 * Commands: RollDice → DeclineProperty → [bid €10] → [pass] → FinishAuctionResolution.
 */
export const winAuctionScenario: TestScenario = {
  description: 'Winning an auction grants property ownership at bid price',
  rules: ['auction winner = ownerPlayerId, cash -= winning bid'],
  players: [
    { cash: 1500, boardIndex: 0  },
    { cash: 1500, boardIndex: 10 },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: {},
}
