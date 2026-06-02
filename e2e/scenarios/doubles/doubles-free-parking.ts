import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 rolls doubles (non-third) and lands on FREE_PARKING — a neutral spot.
 * Doubles grant an extra turn: phase stays WAITING_FOR_ROLL instead of advancing.
 *
 * Position 14 (P3) + dice [3,3]=6 → 20 = FREE_PARKING.
 * consecutiveDoubles 0 → 1. No cash effect.
 */
export const doublesFreeParkingScenario: TestScenario = {
  description: 'Rolling doubles gives an extra turn (phase stays WAITING_FOR_ROLL)',
  rules: ['doubles → WAITING_FOR_ROLL (extra turn), no end-turn required'],
  players: [
    { cash: 1500, boardIndex: 14 },  // seat 0: at P3
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 0 },
  forcedDice: [3, 3],  // doubles, sum=6 → 14+6=20 = FREE_PARKING
  expectedAfter: {
    phase: 'WAITING_FOR_ROLL',
    playerBoardIndex: { 0: 20 },
  },
}
