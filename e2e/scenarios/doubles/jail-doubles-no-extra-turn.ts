import type { TestScenario } from '../../helpers/scenario'

/**
 * Jail doubles behave differently from free doubles: the player escapes and moves,
 * but does NOT receive an extra turn.  Phase goes to WAITING_FOR_END_TURN, not
 * WAITING_FOR_ROLL.
 *
 * Seat 0 in jail, rolls [3,3]=6 (doubles) → escapes → lands on position 16 (O1).
 * Seat 0 owns O1 so no rent/decision is triggered.
 * Expected: inJail=false, boardIndex=16, phase=WAITING_FOR_END_TURN.
 *
 * Compare with D1–D4 (free doubles → WAITING_FOR_ROLL).
 */
export const jailDoublesNoExtraTurnScenario: TestScenario = {
  description: 'Doubles from jail grant no extra turn (WAITING_FOR_END_TURN, not WAITING_FOR_ROLL)',
  rules: ['jail escape via doubles ≠ extra turn; only free doubles grant WAITING_FOR_ROLL'],
  players: [
    { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 },
    { cash: 1500, boardIndex: 0  },
  ],
  ownedProperties: { 0: ['O1'] },  // seat 0 owns landing spot → no rent/decision
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 0 },
  forcedDice: [3, 3],  // doubles → escape jail, move to 10+6=16 = O1
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerInJail: { 0: false },
    playerBoardIndex: { 0: 16 },
  },
}
