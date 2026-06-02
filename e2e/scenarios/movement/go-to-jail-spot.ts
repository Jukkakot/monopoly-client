import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 lands on the GO TO JAIL corner (position 30).
 * Position 27 (Y2/Leppävaara) + dice [2,1]=3 → 30 = GO_TO_JAIL.
 * No GO crossing (27+3=30 < 40).
 * Backend teleports player to position 10 (JAIL), sets inJail=true.
 * Cash is unchanged — GO_TO_JAIL doesn't cross GO.
 */
export const goToJailSpotScenario: TestScenario = {
  description: 'Landing on GO TO JAIL corner sends player to jail',
  rules: ['GO_TO_JAIL corner → inJail=true, boardIndex=10, no GO bonus'],
  players: [
    { cash: 1500, boardIndex: 27 },  // seat 0: at Y2 (Leppävaara)
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [2, 1],  // sum=3 (non-doubles) → 27+3=30 = GO_TO_JAIL
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerBoardIndex: { 0: 10 },
    playerInJail: { 0: true },
  },
}
