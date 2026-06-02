import { describe, test, expect } from 'vitest'
import { createBotSession, getSnapshot, injectState, sendCmdRaw, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'
import { runCmds } from '../helpers/run'
import type { CmdFactory } from '../helpers/run'
import { mortgageB2Scenario } from '../scenarios/mortgage/mortgage-b2'
import { unmortgageB2Scenario } from '../scenarios/mortgage/unmortgage-b2'

// B2: price=60 → mortgageValue = price/2 = 30
// unmortgageCost = 30 + (int)(30 × 0.1) = 33
const B2_MORTGAGE_VALUE = 30
const B2_UNMORTGAGE_COST = 33

const toggleMortgage = (propId: string): CmdFactory =>
  ids => ({ type: 'ToggleMortgage', actorPlayerId: ids[0], propertyId: propId })

describe('Mortgage & unmortgage', () => {
  test('M1 MortgageProperty → cash += mortgageValue, mortgaged=true', async () => {
    const snap = await runCmds(mortgageB2Scenario, [toggleMortgage('B2')])
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    expect(b2.mortgaged).toBe(true)
    expect(snap.state!.players[0].cash).toBe(mortgageB2Scenario.players[0].cash + B2_MORTGAGE_VALUE)
  })

  test('M2 UnmortgageProperty → cash -= unmortgageCost, mortgaged=false', async () => {
    const snap = await runCmds(unmortgageB2Scenario, [toggleMortgage('B2')])
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    expect(b2.mortgaged).toBe(false)
    expect(snap.state!.players[0].cash).toBe(unmortgageB2Scenario.players[0].cash - B2_UNMORTGAGE_COST)
  })

  test('M3 insufficient cash to unmortgage → command rejected', async () => {
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B2'] },
        propertyOverrides: { B2: { mortgaged: true } },
        turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const seat0Id = snap0.state!.players[0].playerId
      const result = await sendCmdRaw(sid, { type: 'ToggleMortgage', actorPlayerId: seat0Id, propertyId: 'B2' })
      expect(result.accepted).toBe(false)
    } finally {
      await deleteSession(sid)
    }
  })

  test('M4 ToggleMortgage rejected in WAITING_FOR_ROLL phase', async () => {
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B2'] },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const seat0Id = snap0.state!.players[0].playerId
      const result = await sendCmdRaw(sid, { type: 'ToggleMortgage', actorPlayerId: seat0Id, propertyId: 'B2' })
      expect(result.accepted).toBe(false)
    } finally {
      await deleteSession(sid)
    }
  })
})
