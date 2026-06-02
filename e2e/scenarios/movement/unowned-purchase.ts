import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 lands on B2 (position 3) which nobody owns.
 * Expected: phase = WAITING_FOR_DECISION, pendingDecision.payload.propertyId = 'B2'
 * Seat 0 at 0 (GO), dice [1,2]=3 → 3 = B2 (no GO crossing).
 */
export const unownedPurchaseScenario: TestScenario = {
  description: 'Landing on unowned property opens a purchase decision',
  rules: ['landing on unowned property → WAITING_FOR_DECISION'],
  players: [
    { cash: 1500, boardIndex: 0  },
    { cash: 1500, boardIndex: 10 },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: { phase: 'WAITING_FOR_DECISION' },
}
