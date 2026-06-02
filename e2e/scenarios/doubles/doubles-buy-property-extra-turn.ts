import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 rolls doubles and lands on unowned B2 → WAITING_FOR_DECISION.
 * After buying, the doubles shortcut fires: phase → WAITING_FOR_ROLL (not WAITING_FOR_END_TURN).
 *
 * Position 1 (B1) + dice [1,1]=2 → 3 = B2 (unowned). No GO crossing.
 * B2 list price = €60.
 *
 * This scenario requires TWO commands: RollDice then BuyProperty.
 * Use runCmds([rollAs(s), (ids) => ({ type: 'BuyProperty', actorPlayerId: ids[0] })]).
 */
export const doublesBuyPropertyExtraTurnScenario: TestScenario = {
  description: 'After buying property on doubles roll, extra turn is granted (WAITING_FOR_ROLL)',
  rules: ['doubles shortcut: BuyProperty → WAITING_FOR_ROLL, not WAITING_FOR_END_TURN'],
  players: [
    { cash: 1500, boardIndex: 1  },  // seat 0: at B1, will buy B2
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail / just visiting
  ],
  // No ownedProperties: B2 is unowned so landing triggers purchase decision
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 0 },
  forcedDice: [1, 1],  // doubles, sum=2 → 1+2=3 = B2 (unowned)
  expectedAfter: {
    phase: 'WAITING_FOR_ROLL',
    playerCashDelta: { 0: -60 },  // B2 costs €60
    playerBoardIndex: { 0: 3 },
  },
}
