import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 already has 1 consecutive double. Rolling a second double still grants
 * an extra turn (phase stays WAITING_FOR_ROLL). Only the THIRD double sends to jail.
 *
 * Position 14 (P3) + dice [3,3]=6 → 20 = FREE_PARKING.
 * consecutiveDoubles 1 → 2. No cash effect.
 */
export const doublesSecondConsecutiveScenario: TestScenario = {
  description: 'Second consecutive double still grants extra turn (not jail)',
  rules: ['2nd consecutive double → WAITING_FOR_ROLL, only 3rd → jail'],
  players: [
    { cash: 1500, boardIndex: 14 },  // seat 0: at P3
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 1 },
  forcedDice: [3, 3],  // doubles, sum=6 → 14+6=20 = FREE_PARKING
  expectedAfter: {
    phase: 'WAITING_FOR_ROLL',
    playerBoardIndex: { 0: 20 },
    playerInJail: { 0: false },
  },
}
