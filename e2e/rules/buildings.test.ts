import { describe, test, expect } from 'vitest'
import { createBotSession, getSnapshot, injectState, sendCmdRaw, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'
import { runCmds } from '../helpers/run'
import type { CmdFactory } from '../helpers/run'
import { buyFirstHouseScenario } from '../scenarios/buildings/buy-first-house'
import { buyHotelScenario } from '../scenarios/buildings/buy-hotel'
import { sellHouseScenario } from '../scenarios/buildings/sell-house'
import { sellHotelScenario } from '../scenarios/buildings/sell-hotel'

const buyOn = (propId: string): CmdFactory =>
  ids => ({ type: 'BuyBuildingRound', actorPlayerId: ids[0], propertyId: propId })

const sellOn = (propId: string): CmdFactory =>
  ids => ({ type: 'SellBuildingRound', actorPlayerId: ids[0], propertyId: propId })

describe('Buildings', () => {
  test('4.1 buying building requires full monopoly → rejected without it', async () => {
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      // Inject: seat0 owns only B2 (no B1 → no monopoly), WAITING_FOR_END_TURN
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B2'] },
        turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const seat0Id = snap0.state!.players[0].playerId
      const result = await sendCmdRaw(sid, { type: 'BuyBuildingRound', actorPlayerId: seat0Id, propertyId: 'B2' })
      expect(result.accepted).toBe(false)
    } finally {
      await deleteSession(sid)
    }
  })

  test('4.2 even building required: can\'t add 2nd house while another property has fewer', async () => {
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      // B1=1 house, B2=2 houses → buying on B2 would make B2=3 (diff=2) → rejected
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B1', 'B2'] },
        propertyOverrides: { B1: { houseCount: 1 }, B2: { houseCount: 2 } },
        turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const seat0Id = snap0.state!.players[0].playerId
      const result = await sendCmdRaw(sid, { type: 'BuyBuildingRound', actorPlayerId: seat0Id, propertyId: 'B2' })
      expect(result.accepted).toBe(false)
    } finally {
      await deleteSession(sid)
    }
  })

  test('4.3 buying 5th house converts to hotel (houseCount=0, hotelCount=1)', async () => {
    const snap = await runCmds(buyHotelScenario, [buyOn('B1')])
    const b1 = snap.state!.properties.find(p => p.propertyId === 'B1')!
    expect(b1.hotelCount).toBe(1)
    expect(b1.houseCount).toBe(0)
    expect(snap.state?.players[0].cash).toBe(buyHotelScenario.players[0].cash - 50)
  })

  test('4.4 buying first house on monopoly works (sanity check)', async () => {
    const snap = await runCmds(buyFirstHouseScenario, [buyOn('B1')])
    const b1 = snap.state!.properties.find(p => p.propertyId === 'B1')!
    expect(b1.houseCount).toBe(1)
    expect(snap.state?.players[0].cash).toBe(buyFirstHouseScenario.players[0].cash - 50)
  })

  test('4.5 selling a house returns half price (€25)', async () => {
    const snap = await runCmds(sellHouseScenario, [sellOn('B2')])
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    expect(b2.houseCount).toBe(1)
    expect(snap.state?.players[0].cash).toBe(sellHouseScenario.players[0].cash + 25)
  })

  test('4.6 selling hotel → 4 houses returned, cash +25', async () => {
    const snap = await runCmds(sellHotelScenario, [sellOn('B2')])
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    expect(b2.hotelCount).toBe(0)
    expect(b2.houseCount).toBe(4)
    expect(snap.state?.players[0].cash).toBe(sellHotelScenario.players[0].cash + 25)
  })

  test('4.7 can\'t build if any property in group is mortgaged → rejected', async () => {
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      // B1 mortgaged → can't build on B2
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B1', 'B2'] },
        propertyOverrides: { B1: { mortgaged: true } },
        turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const seat0Id = snap0.state!.players[0].playerId
      const result = await sendCmdRaw(sid, { type: 'BuyBuildingRound', actorPlayerId: seat0Id, propertyId: 'B2' })
      expect(result.accepted).toBe(false)
    } finally {
      await deleteSession(sid)
    }
  })
})
