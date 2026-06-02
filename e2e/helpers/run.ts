import type { ClientSessionSnapshot } from '../../src/types/api'
import type { TestScenario } from './scenario'
import { createBotSession, getSnapshot, injectState, sendCmd, deleteSession } from './api'
import { buildPatch } from './scenario'

/**
 * A command factory receives the current player-ID array (indexed by seat) and
 * the latest snapshot, and returns the command body to send.
 */
export type CmdFactory = (playerIds: string[], snap: ClientSessionSnapshot) => object

/**
 * Runs a scenario by:
 *   1. Creating a bot session (bots have 4 s initial delay → won't interfere)
 *   2. Injecting the desired game state
 *   3. Executing each command in order, refreshing the snapshot in-between
 *   4. Returning the final snapshot for assertions
 *
 * Sessions are deleted in `finally` so they don't outlive a failed test.
 */
export async function runCmds(
  scenario: TestScenario,
  cmds: CmdFactory[],
): Promise<ClientSessionSnapshot> {
  const count = scenario.players.length as 2 | 3 | 4
  const sid = await createBotSession(count)
  const snap0 = await getSnapshot(sid)
  try {
    await injectState(sid, buildPatch(scenario, snap0))
    const playerIds = snap0.state!.players.map(p => p.playerId)
    let snap: ClientSessionSnapshot = snap0
    for (const factory of cmds) {
      await sendCmd(sid, factory(playerIds, snap))
      snap = await getSnapshot(sid)
    }
    return snap
  } finally {
    await deleteSession(sid)
  }
}

/** Shorthand: roll dice as the scenario's active seat. */
export function rollAs(scenario: TestScenario): CmdFactory {
  return ids => ({ type: 'RollDice', actorPlayerId: ids[scenario.turn.seat] })
}

/** Shorthand: end turn as the scenario's active seat. */
export function endTurnAs(scenario: TestScenario): CmdFactory {
  return ids => ({ type: 'EndTurn', actorPlayerId: ids[scenario.turn.seat] })
}
