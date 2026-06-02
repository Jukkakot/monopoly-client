import { describe, test, expect } from 'vitest'
import { runCmds, rollAs } from '../helpers/run'
import { doublesFreeParkingScenario } from '../scenarios/doubles/doubles-free-parking'
import { doublesSecondConsecutiveScenario } from '../scenarios/doubles/doubles-second-consecutive'
import { doublesPayRentExtraTurnScenario } from '../scenarios/doubles/doubles-pay-rent-extra-turn'
import { doublesBuyPropertyExtraTurnScenario } from '../scenarios/doubles/doubles-buy-property-extra-turn'
import { nonDoublesEndTurnScenario } from '../scenarios/doubles/non-doubles-end-turn'

describe('Doubles — extra turn mechanics', () => {
  test('D1 doubles on free parking → WAITING_FOR_ROLL (extra turn)', async () => {
    const snap = await runCmds(doublesFreeParkingScenario, [rollAs(doublesFreeParkingScenario)])
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_ROLL')
    expect(snap.state?.turn?.canRoll).toBe(true)
    expect(snap.state?.players[0].boardIndex).toBe(20)
  })

  test('D2 second consecutive double → still WAITING_FOR_ROLL (not jail)', async () => {
    const snap = await runCmds(doublesSecondConsecutiveScenario, [rollAs(doublesSecondConsecutiveScenario)])
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_ROLL')
    expect(snap.state?.players[0].inJail).toBe(false)
    expect(snap.state?.players[0].boardIndex).toBe(20)
  })

  test('D3 doubles + rent paid → WAITING_FOR_ROLL (extra turn after rent)', async () => {
    const snap = await runCmds(doublesPayRentExtraTurnScenario, [rollAs(doublesPayRentExtraTurnScenario)])
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_ROLL')
    expect(snap.state?.players[0].cash).toBe(doublesPayRentExtraTurnScenario.players[0].cash - 4)
    expect(snap.state?.players[1].cash).toBe(doublesPayRentExtraTurnScenario.players[1].cash + 4)
  })

  test('D4 doubles on unowned property, buy → WAITING_FOR_ROLL (doubles shortcut)', async () => {
    const s = doublesBuyPropertyExtraTurnScenario
    const snap = await runCmds(s, [
      rollAs(s),
      (ids, snap) => ({
        type: 'BuyProperty',
        actorPlayerId: ids[s.turn.seat],
        decisionId: snap.state!.pendingDecision!.decisionId,
        propertyId: snap.state!.pendingDecision!.payload.propertyId,
      }),
    ])
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_ROLL')
    expect(snap.state?.players[0].cash).toBe(s.players[0].cash - 60)
    const b2 = snap.state?.properties.find(p => p.propertyId === 'B2')
    expect(b2?.ownerPlayerId).toBeTruthy()  // owned by seat 0 now
  })

  test('D5 non-doubles control → WAITING_FOR_END_TURN', async () => {
    const snap = await runCmds(nonDoublesEndTurnScenario, [rollAs(nonDoublesEndTurnScenario)])
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_END_TURN')
    expect(snap.state?.turn?.canRoll).toBe(false)
    expect(snap.state?.players[0].boardIndex).toBe(20)
  })
})
