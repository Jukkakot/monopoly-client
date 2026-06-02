import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 1 owns B2 (Kruunuhaka) — but NOT B1, so no BROWN monopoly.
 * Seat 0 at index 0 (GO), dice [1,2] = 3 → 0+3=3 = B2.
 * No GO crossing (3 < 40), so no GO bonus.
 * Base rent for B2 = €4 (from RENT_TABLE: B2=[4,20,60,180,320,450]).
 * Non-doubles → no extra turn.
 *
 * Note: Landing on B1 from any valid starting position always crosses GO
 * (position 1 requires sum=1, impossible with two dice min 2).
 * Use B2 instead so the path stays within the same lap.
 */
export const basicRentScenario: TestScenario = {
  description: 'Landing on owned property without monopoly charges base rent (B2 = €4)',
  rules: ['rent = base rent[0] when owner has no full color set'],
  players: [
    { cash: 1500, boardIndex: 0  },  // seat 0: at GO (no GO bonus on departure)
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  ownedProperties: {
    1: ['B2'],  // seat 1 owns only B2 → no BROWN monopoly
  },
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],  // sum=3 (non-doubles) → 0+3=3 = B2, no GO crossing
  expectedAfter: {
    playerCashDelta: { 0: -4, 1: +4 },  // B2 base rent = €4
  },
}
