import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 uses a Get Out Of Jail Free card to escape jail.
 * After UseGetOutOfJailCard: inJail=false, getOutOfJailCards=0, phase=WAITING_FOR_ROLL.
 * No cash change (the card is free).
 */
export const useGoojfCardScenario: TestScenario = {
  description: 'Using Get Out Of Jail Free card releases player without paying',
  rules: ['UseGetOutOfJailCard → inJail=false, card consumed, no cash cost'],
  players: [
    { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2, getOutOfJailCards: 1 },
    { cash: 1500, boardIndex: 0  },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  expectedAfter: {
    phase: 'WAITING_FOR_ROLL',
    playerInJail: { 0: false },
  },
}
