import { describe, test, expect } from 'vitest'
import { createBotSession, getSnapshot, injectState, sendCmd, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'
import { passGoScenario } from '../scenarios/movement/pass-go'
import { basicRentScenario } from '../scenarios/movement/basic-rent'
import { monopolyDoubleRentScenario } from '../scenarios/movement/monopoly-double-rent'

/**
 * Drive seat 0's turn manually without bots:
 *   1. Inject scenario state (includes forcedDice)
 *   2. Send RollDice as seat 0 — backend processes synchronously
 *   3. Snapshot immediately — all side-effects (rent, GO bonus) already applied
 *
 * Bot-only sessions have empty playerTokens, so validatePlayerToken() returns true
 * for any actorPlayerId.  The 4-second bot initial-delay means bots won't interfere.
 */
async function runScenario(scenario: typeof passGoScenario) {
  const sid = await createBotSession(2)
  try {
    const snap0 = await getSnapshot(sid)
    await injectState(sid, buildPatch(scenario, snap0))
    const seat0Id = snap0.state!.players[0].playerId
    await sendCmd(sid, { type: 'RollDice', actorPlayerId: seat0Id })
    return await getSnapshot(sid)
  } finally {
    await deleteSession(sid)
  }
}

describe('Movement — POC', () => {
  test('1.9 pass GO: player collects €200', async () => {
    const snap = await runScenario(passGoScenario)
    expect(snap.state?.players[0].cash).toBe(passGoScenario.players[0].cash + 200)
  })

  test('1.2 basic rent: no monopoly → base rent (B2 = €4)', async () => {
    const snap = await runScenario(basicRentScenario)
    expect(snap.state?.players[0].cash).toBe(basicRentScenario.players[0].cash - 4)
    expect(snap.state?.players[1].cash).toBe(basicRentScenario.players[1].cash + 4)
  })

  test('1.3 monopoly double rent: full BROWN set → 2× (B2 = €8)', async () => {
    const snap = await runScenario(monopolyDoubleRentScenario)
    expect(snap.state?.players[0].cash).toBe(monopolyDoubleRentScenario.players[0].cash - 8)
    expect(snap.state?.players[1].cash).toBe(monopolyDoubleRentScenario.players[1].cash + 8)
  })
})
