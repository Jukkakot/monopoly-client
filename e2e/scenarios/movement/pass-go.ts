import type { TestScenario } from '../../helpers/scenario'

/**
 * Player at index 37 (DB1/Keilaniemi), dice [2,1] = 3 → index 40%40 = 0 (GO).
 * Non-doubles → no extra turn. Landing on GO → collect €200 → WAITING_FOR_END_TURN.
 * DB1 is unowned but player starts there (doesn't trigger buying — only landing does).
 */
export const passGoScenario: TestScenario = {
  description: 'Player passes through GO and collects €200',
  rules: ['landing on or passing GO = +€200', 'no action for non-property squares'],
  players: [
    { cash: 1200, boardIndex: 37 },  // seat 0: at DB1 (Keilaniemi)
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [2, 1],  // sum=3 (non-doubles) → 37+3=40 → 40%40=0 = GO
  expectedAfter: {
    playerCashDelta: { 0: +200 },
  },
}
