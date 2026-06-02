import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 rolls doubles and lands on seat 1's property (B2, no monopoly, rent €4).
 * Rent is charged normally; doubles still grant an extra turn.
 *
 * Position 1 (B1) + dice [1,1]=2 → 3 = B2. No GO crossing (1+2=3).
 * B2 base rent (no monopoly) = €4.
 * Expected: cash delta -4/+4, phase=WAITING_FOR_ROLL.
 */
export const doublesPayRentExtraTurnScenario: TestScenario = {
  description: 'Doubles grant extra turn even after paying rent',
  rules: ['rent charged normally when doubles land on opponent property; extra turn still applies'],
  players: [
    { cash: 1500, boardIndex: 1  },  // seat 0: at B1
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting, owns B2
  ],
  ownedProperties: { 1: ['B2'] },  // seat 1 owns B2 only → no monopoly (base rent)
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 0 },
  forcedDice: [1, 1],  // doubles, sum=2 → 1+2=3 = B2
  expectedAfter: {
    phase: 'WAITING_FOR_ROLL',
    playerCashDelta: { 0: -4, 1: +4 },
    playerBoardIndex: { 0: 3 },
  },
}
