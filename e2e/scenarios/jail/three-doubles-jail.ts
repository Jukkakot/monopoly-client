import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 already has 2 consecutive doubles. Rolling a third double sends them
 * directly to jail — even if the normal move would have crossed GO.
 *
 * Seat 0 at 34 (G3), consecutiveDoubles=2.
 * Dice [3,3]=6 (doubles) → 34+6=40 → would cross GO and land on 0,
 * BUT third double overrides movement → goes directly to jail (position 10).
 * No GO bonus is collected (direct teleport, no position-crossing logic).
 */
export const threeDoublesJailScenario: TestScenario = {
  description: 'Third consecutive double sends player directly to jail without GO bonus',
  rules: ['3 consecutive doubles → jail, no GO money'],
  players: [
    { cash: 1500, boardIndex: 34 },  // seat 0: at G3 — would pass GO on roll
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 2 },
  forcedDice: [3, 3],  // doubles → third consecutive
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerInJail: { 0: true },
    playerBoardIndex: { 0: 10 },
  },
}
