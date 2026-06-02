import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 lands on TAX2 (Ylellisyysvero, position 38) — luxury tax, fixed €100.
 * Position 33 (COMMUNITY3) + dice [3,2]=5 → 38 = TAX2. No GO crossing (33+5=38 < 40).
 * Starting at COMMUNITY3 (injected) doesn't trigger any card effect.
 */
export const luxuryTaxScenario: TestScenario = {
  description: 'Landing on luxury tax spot charges €100',
  rules: ['TAX2 (Ylellisyysvero) = -€100'],
  players: [
    { cash: 1500, boardIndex: 33 },  // seat 0: at COMMUNITY3 (injected, no effect)
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [3, 2],  // sum=5 → 33+5=38 = TAX2
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: { 0: -100 },
  },
}
