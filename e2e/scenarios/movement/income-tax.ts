import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 lands on TAX1 (Tulovero, position 4) — income tax, fixed €200.
 * Position 1 (B1) + dice [2,1]=3 → 4 = TAX1. No GO crossing (1+3=4 < 40).
 * B1 is unowned; starting there doesn't trigger any effect.
 */
export const incomeTaxScenario: TestScenario = {
  description: 'Landing on income tax spot charges €200',
  rules: ['TAX1 (Tulovero) = -€200'],
  players: [
    { cash: 1500, boardIndex: 1  },  // seat 0: at B1 (unowned, no effect)
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [2, 1],  // sum=3 → 1+3=4 = TAX1
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: { 0: -200 },
  },
}
