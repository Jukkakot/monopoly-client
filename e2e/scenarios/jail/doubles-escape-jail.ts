import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 is in jail. Rolling doubles releases them and moves them normally.
 * No extra turn is granted (jail doubles don't stack into consecutiveDoubles).
 *
 * Seat 0 in jail (position 10), jailRoundsRemaining=2.
 * Dice [3,3]=6 (doubles) → 10+6=16 = O1 (Hermanni, ORANGE).
 * Seat 0 owns O1 → no purchase decision (own property, no rent).
 * Expected: inJail=false, boardIndex=16, phase=WAITING_FOR_END_TURN.
 */
export const doublesEscapeJailScenario: TestScenario = {
  description: 'Rolling doubles from jail releases player without granting extra turn',
  rules: ['jail doubles → escape + move, no extra turn'],
  players: [
    { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 },
    { cash: 1500, boardIndex: 0  },
  ],
  ownedProperties: { 0: ['O1'] },  // seat 0 owns landing spot → no rent or decision
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [3, 3],  // doubles
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerInJail: { 0: false },
    playerBoardIndex: { 0: 16 },
  },
}
