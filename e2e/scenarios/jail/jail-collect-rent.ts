import type { TestScenario } from '../../helpers/scenario'

/**
 * A player in jail can still collect rent when others land on their properties.
 *
 * Seat 0 is IN JAIL, owns B2 (no monopoly, base rent = €4).
 * Seat 1 is the active player at position 0 (GO), rolls [1,2]=3 → B2 (position 3).
 * Seat 0 collects €4 rent despite being in jail.
 *
 * Note: turn.seat=1 (seat 1 is rolling, not seat 0).
 */
export const jailCollectRentScenario: TestScenario = {
  description: 'Player in jail collects rent when others land on their property',
  rules: ['being in jail does not prevent collecting rent'],
  players: [
    { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 },  // seat 0: in jail, owns B2
    { cash: 1500, boardIndex: 0  },                                         // seat 1: active, will land on B2
  ],
  ownedProperties: { 0: ['B2'] },  // seat 0 owns B2 (no monopoly)
  turn: { seat: 1, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],  // sum=3 → 0+3=3 = B2
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: { 0: +4, 1: -4 },  // B2 base rent = €4
  },
}
