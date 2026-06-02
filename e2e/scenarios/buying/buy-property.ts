import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 lands on unowned B2, buys it at list price (€60).
 * Seat 0 at 0 (GO), dice [1,2]=3 → B2. RollDice → WAITING_FOR_DECISION.
 * Then BuyProperty(decisionId, 'B2') → B2 owned by seat0, cash -60.
 */
export const buyPropertyScenario: TestScenario = {
  description: 'Player buys unowned property at listed price',
  rules: ['BuyProperty → ownerPlayerId set, cash -= price'],
  players: [
    { cash: 1500, boardIndex: 0  },
    { cash: 1500, boardIndex: 10 },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],  // → B2 (position 3)
  expectedAfter: {
    propertyOwner: { B2: 0 },
    playerCashDelta: { 0: -60 },
  },
}
