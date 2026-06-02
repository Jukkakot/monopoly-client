import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 lands EXACTLY on GO (position 0).
 * Position 37 (DB1) + dice [2,1]=3 → 40 % 40 = 0 (GO).
 * Non-doubles → no extra turn. Landing on GO → +€200 → WAITING_FOR_END_TURN.
 */
export const landOnGoScenario: TestScenario = {
  description: 'Landing exactly on GO collects €200',
  rules: ['landing on GO = +€200'],
  players: [
    { cash: 1500, boardIndex: 37 },  // seat 0: at DB1 (Keilaniemi)
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [2, 1],  // sum=3 (non-doubles) → 37+3=40 → 40%40=0 = GO
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: { 0: +200 },
    playerBoardIndex: { 0: 0 },
  },
}
