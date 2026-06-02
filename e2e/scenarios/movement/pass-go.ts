import type { TestScenario } from '../../helpers/scenario'

/**
 * TRUE pass-through GO: seat 0 starts near end of board, rolls across GO,
 * and lands on position 10 (JAIL/just-visiting) — a neutral, effect-free spot.
 *
 * Position 39 (DB2) + dice [6,5]=11 → 50 % 40 = 10 (JAIL/just-visiting).
 * Crosses GO (position 0) on the way → +€200 bonus.
 * Non-doubles (6 ≠ 5) → no extra turn.
 */
export const passGoScenario: TestScenario = {
  description: 'Passing THROUGH GO (not landing on it) collects €200',
  rules: ['passing GO = +€200'],
  players: [
    { cash: 1500, boardIndex: 39 },  // seat 0: at DB2 (last property on board)
    { cash: 1500, boardIndex: 20 },  // seat 1: at Free Parking
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [6, 5],  // sum=11 (non-doubles) → 39+11=50 → 50%40=10 (JAIL/visiting)
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: { 0: +200 },
    playerBoardIndex: { 0: 10 },
  },
}
