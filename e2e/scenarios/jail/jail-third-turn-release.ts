import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 is on their LAST jail turn (jailRoundsRemaining=1) and doesn't roll
 * doubles → forced release + automatic €50 fine, then moves with the rolled dice.
 *
 * Dice [4,6]=10 (non-doubles) → released from jail, pays €50, moves to 10+10=20 (FREE_PARKING).
 * FREE_PARKING has no effect → phase = WAITING_FOR_END_TURN.
 * Net cash change: -50 (fine only, FREE_PARKING charges nothing).
 */
export const jailThirdTurnReleaseScenario: TestScenario = {
  description: 'Third jail turn without doubles forces release + €50 fine then move',
  rules: ['jailRoundsRemaining=1, no doubles → auto-release + €50 fine + move'],
  players: [
    { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 1 },
    { cash: 1500, boardIndex: 0  },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [4, 6],  // sum=10 (non-doubles) → 10+10=20 = FREE_PARKING
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerInJail: { 0: false },
    playerCashDelta: { 0: -50 },
    playerBoardIndex: { 0: 20 },
  },
}
