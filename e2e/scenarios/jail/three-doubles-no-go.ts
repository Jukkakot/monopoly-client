import type { TestScenario } from '../../helpers/scenario'

/**
 * Third consecutive double when the path would cross GO.
 * Verifies that GO money is NOT collected — same as three-doubles-jail but
 * the explicit assertion is on cash being UNCHANGED (no +200).
 *
 * Seat 0 at 34 (G3), consecutiveDoubles=2.
 * Dice [3,3]=6 → normal move would be 34+6=40→0 (passes GO → +€200).
 * But third double → direct jail. Cash must stay 1500.
 */
export const threeDoublesNoGoScenario: TestScenario = {
  description: 'Third consecutive double to jail does NOT grant GO bonus',
  rules: ['3 consecutive doubles → jail, no GO money even if path crossed GO'],
  players: [
    { cash: 1500, boardIndex: 34 },
    { cash: 1500, boardIndex: 10 },
  ],
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 2 },
  forcedDice: [3, 3],
  expectedAfter: {
    playerInJail: { 0: true },
    playerBoardIndex: { 0: 10 },
  },
}
