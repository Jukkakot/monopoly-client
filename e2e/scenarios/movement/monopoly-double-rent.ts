import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 1 owns BOTH B1 and B2 → full BROWN monopoly (group size = 2).
 * Seat 0 at index 0 (GO), dice [1,2] = 3 → 0+3=3 = B2 (Kruunuhaka).
 * Full monopoly, no houses → double base rent: B2 base=€4, monopoly=€8.
 * Non-doubles → no extra turn.
 */
export const monopolyDoubleRentScenario: TestScenario = {
  description: 'Full BROWN color set charges double base rent (B2 = €4 × 2 = €8)',
  rules: ['full color monopoly (no buildings) = 2× base rent'],
  players: [
    { cash: 1500, boardIndex: 0  },  // seat 0: at GO
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  ownedProperties: {
    1: ['B1', 'B2'],  // seat 1 owns full BROWN set → monopoly
  },
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],  // sum=3 (non-doubles) → 0+3=3 = B2
  expectedAfter: {
    playerCashDelta: { 0: -8, 1: +8 },  // B2 monopoly rent = €4 × 2 = €8
  },
}
