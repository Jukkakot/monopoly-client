import type { TestScenario } from '../../helpers/scenario'

/**
 * All eligible players pass the auction → property stays with bank (unowned).
 * Same setup as decline-to-auction but both players pass.
 */
export const allPassAuctionScenario: TestScenario = {
  description: 'All players passing the auction leaves property unowned',
  rules: ['all pass auction → ownerPlayerId = null'],
  players: [
    { cash: 1500, boardIndex: 0  },
    { cash: 1500, boardIndex: 10 },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: {
    propertyOwner: { B2: null },
  },
}
