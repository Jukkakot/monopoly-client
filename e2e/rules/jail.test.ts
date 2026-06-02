import { describe, test, expect } from 'vitest'
import { runCmds, rollAs } from '../helpers/run'
import type { CmdFactory } from '../helpers/run'
import { threeDoublesJailScenario } from '../scenarios/jail/three-doubles-jail'
import { doublesEscapeJailScenario } from '../scenarios/jail/doubles-escape-jail'
import { payJailFineScenario } from '../scenarios/jail/pay-jail-fine'
import { useGoojfCardScenario } from '../scenarios/jail/use-goojf-card'
import { jailThirdTurnReleaseScenario } from '../scenarios/jail/jail-third-turn-release'
import { jailCollectRentScenario } from '../scenarios/jail/jail-collect-rent'
import { threeDoublesNoGoScenario } from '../scenarios/jail/three-doubles-no-go'

const payFine: CmdFactory = ids => ({ type: 'PayJailFine', actorPlayerId: ids[0] })
const useCard: CmdFactory = ids => ({ type: 'UseGetOutOfJailCard', actorPlayerId: ids[0] })

describe('Jail rules', () => {
  test('2.1 three consecutive doubles → jail (inJail=true, boardIndex=10)', async () => {
    const snap = await runCmds(threeDoublesJailScenario, [rollAs(threeDoublesJailScenario)])
    expect(snap.state?.players[0].inJail).toBe(true)
    expect(snap.state?.players[0].boardIndex).toBe(10)
  })

  test('2.2 doubles from jail → escape + move, no extra turn', async () => {
    const snap = await runCmds(doublesEscapeJailScenario, [rollAs(doublesEscapeJailScenario)])
    expect(snap.state?.players[0].inJail).toBe(false)
    expect(snap.state?.players[0].boardIndex).toBe(16)
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_END_TURN')
  })

  test('2.3 pay €50 fine → inJail=false, cash -50', async () => {
    const snap = await runCmds(payJailFineScenario, [payFine])
    expect(snap.state?.players[0].inJail).toBe(false)
    expect(snap.state?.players[0].cash).toBe(payJailFineScenario.players[0].cash - 50)
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_ROLL')
  })

  test('2.4 use GOOJF card → inJail=false, card consumed, no cash cost', async () => {
    const snap = await runCmds(useGoojfCardScenario, [useCard])
    expect(snap.state?.players[0].inJail).toBe(false)
    expect(snap.state?.players[0].getOutOfJailCards).toBe(0)
    expect(snap.state?.players[0].cash).toBe(useGoojfCardScenario.players[0].cash)
  })

  test('2.5 third jail turn, no doubles → auto-release + €50 fine + move', async () => {
    const snap = await runCmds(jailThirdTurnReleaseScenario, [rollAs(jailThirdTurnReleaseScenario)])
    expect(snap.state?.players[0].inJail).toBe(false)
    expect(snap.state?.players[0].cash).toBe(jailThirdTurnReleaseScenario.players[0].cash - 50)
    expect(snap.state?.players[0].boardIndex).toBe(20)
  })

  test('2.6 in-jail player collects rent when others land on their property', async () => {
    const snap = await runCmds(jailCollectRentScenario, [rollAs(jailCollectRentScenario)])
    expect(snap.state?.players[0].cash).toBe(jailCollectRentScenario.players[0].cash + 4)
    expect(snap.state?.players[1].cash).toBe(jailCollectRentScenario.players[1].cash - 4)
  })

  test('2.7 third consecutive double → jail, no GO bonus even if path crossed GO', async () => {
    const snap = await runCmds(threeDoublesNoGoScenario, [rollAs(threeDoublesNoGoScenario)])
    expect(snap.state?.players[0].inJail).toBe(true)
    expect(snap.state?.players[0].cash).toBe(threeDoublesNoGoScenario.players[0].cash)
  })
})
