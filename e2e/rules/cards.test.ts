import { describe, test, expect } from 'vitest'
import { runCmds, rollAs } from '../helpers/run'
import type { CmdFactory } from '../helpers/run'
import type { TestScenario } from '../helpers/scenario'

// Acknowledge the drawn card — required before effects are applied
const ackCard: CmdFactory = ids => ({ type: 'AcknowledgeCard', actorPlayerId: ids[0] })

// Seat 0 at position 4 (TAX1), dice [2,1]=3 → 7 = CHANCE1
function chanceScenario(cardKey: string): TestScenario {
  return {
    description: `Chance card: ${cardKey}`,
    rules: [],
    players: [
      { cash: 1500, boardIndex: 4  },  // at TAX1 — no effect when injected there
      { cash: 1500, boardIndex: 10 },
    ],
    turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
    forcedDice: [2, 1],  // sum=3 → 4+3=7 = CHANCE1
    forcedChanceCard: cardKey,
    expectedAfter: {},
  }
}

// Seat 0 at position 14 (P3/Kumpula), dice [2,1]=3 → 17 = COMMUNITY2
function communityScenario(cardKey: string, jailCards = 0): TestScenario {
  return {
    description: `Community card: ${cardKey}`,
    rules: [],
    players: [
      { cash: 1500, boardIndex: 14, getOutOfJailCards: jailCards },
      { cash: 1500, boardIndex: 0  },
    ],
    turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
    forcedDice: [2, 1],  // sum=3 → 14+3=17 = COMMUNITY2
    forcedCommunityCard: cardKey,
    expectedAfter: {},
  }
}

describe('Cards', () => {
  test('8.1 chance GO_JAIL card → player goes to jail', async () => {
    const scenario = chanceScenario('GO_JAIL:0')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].inJail).toBe(true)
    expect(snap.state?.players[0].boardIndex).toBe(10)
  })

  test('8.2 chance MOVE card (advance to Go) → boardIndex=0, cash +200', async () => {
    // MOVE:1 = "Advance to Go (Collect M200)" → GO_SPOT (index 0)
    const scenario = chanceScenario('MOVE:1')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].boardIndex).toBe(0)
    expect(snap.state?.players[0].cash).toBe(1500 + 200)
  })

  test('8.3 chance MONEY card (building loan) → cash +150', async () => {
    // MONEY:0 = "Your building loan matures. Collect M150" → +150
    const scenario = chanceScenario('MONEY:0')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].cash).toBe(1500 + 150)
  })

  test('8.4 community MONEY card (bank error) → cash +200', async () => {
    // MONEY:0 = "Bank error in your favor. Collect M200" → +200
    const scenario = communityScenario('MONEY:0')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].cash).toBe(1500 + 200)
  })

  test('8.5 community OUT_OF_JAIL card → getOutOfJailCards +1', async () => {
    // OUT_OF_JAIL:0 = "Get Out of Jail Free"
    const scenario = communityScenario('OUT_OF_JAIL:0', 0)
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].getOutOfJailCards).toBe(1)
  })

  test('8.6 community ALL_PLAYERS_MONEY (birthday) → collect €10 from each other player', async () => {
    // ALL_PLAYERS_MONEY:0 = "It is your birthday. Collect M10 from every player" → +10 per other
    const scenario = communityScenario('ALL_PLAYERS_MONEY:0')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    // 2-player game: seat0 collects €10 from seat1
    expect(snap.state?.players[0].cash).toBe(1500 + 10)
    expect(snap.state?.players[1].cash).toBe(1500 - 10)
  })
})
