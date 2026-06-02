import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 pays the €50 jail fine before rolling.
 * After PayJailFine: inJail=false, cash -50, phase stays WAITING_FOR_ROLL.
 * (Player still needs to roll — PayJailFine only removes the jail status.)
 */
export const payJailFineScenario: TestScenario = {
  description: 'Paying €50 jail fine releases player (before roll)',
  rules: ['PayJailFine → inJail=false, cash -50'],
  players: [
    { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 },
    { cash: 1500, boardIndex: 0  },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  expectedAfter: {
    phase: 'WAITING_FOR_ROLL',  // still waiting to roll after paying fine
    playerCashDelta: { 0: -50 },
    playerInJail: { 0: false },
  },
}
