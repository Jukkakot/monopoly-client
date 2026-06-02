import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 rolls non-doubles and lands on FREE_PARKING — phase goes to WAITING_FOR_END_TURN.
 * This is the control case confirming that only doubles grant an extra roll.
 *
 * Position 10 (JAIL/visiting) + dice [4,6]=10 → 20 = FREE_PARKING.
 * 4 ≠ 6 → non-doubles → no extra turn.
 */
export const nonDoublesEndTurnScenario: TestScenario = {
  description: 'Non-doubles: phase advances to WAITING_FOR_END_TURN (no extra turn)',
  rules: ['non-doubles → WAITING_FOR_END_TURN'],
  players: [
    { cash: 1500, boardIndex: 10 },  // seat 0: at jail / just visiting
    { cash: 1500, boardIndex: 0  },  // seat 1: at GO
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 0 },
  forcedDice: [4, 6],  // sum=10, non-doubles → 10+10=20 = FREE_PARKING
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerBoardIndex: { 0: 20 },
  },
}
