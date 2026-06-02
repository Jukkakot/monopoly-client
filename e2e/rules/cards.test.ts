import { describe, test, expect } from 'vitest'
import { runCmds, rollAs } from '../helpers/run'
import type { CmdFactory } from '../helpers/run'
import type { TestScenario } from '../helpers/scenario'

// Board index reference (relevant spots)
// 5=RR1, 7=CHANCE1, 12=U1, 15=RR2, 22=CHANCE2, 25=RR3, 28=U2, 35=RR4

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

  test('8.7 MOVE_NEAREST RAILROAD → advances to nearest railroad ahead', async () => {
    // From CHANCE1 (7), nearest railroad forward = RR2 at index 15
    // RR2 is unowned → WAITING_FOR_DECISION, no GO bonus (15 > 7)
    const scenario = chanceScenario('MOVE_NEAREST:0')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].boardIndex).toBe(15)  // RR2
    expect(snap.state?.players[0].cash).toBe(1500)
    expect(snap.state?.turn.phase).toBe('WAITING_FOR_DECISION')
  })

  test('8.8 MOVE_NEAREST UTILITY → advances to nearest utility ahead', async () => {
    // From CHANCE1 (7), nearest utility forward = U1 at index 12
    // U1 is unowned → WAITING_FOR_DECISION, no GO bonus (12 > 7)
    const scenario = chanceScenario('MOVE_NEAREST:1')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].boardIndex).toBe(12)  // U1
    expect(snap.state?.players[0].cash).toBe(1500)
    expect(snap.state?.turn.phase).toBe('WAITING_FOR_DECISION')
  })

  test('8.9 MOVE_BACK_3 from CHANCE1 → lands on TAX1, pays €200', async () => {
    // CHANCE1 is at index 7; 7-3=4 = TAX1 (Tulovero €200)
    // Moving backward never crosses GO
    const scenario = chanceScenario('MOVE_BACK_3:0')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].boardIndex).toBe(4)   // TAX1
    expect(snap.state?.players[0].cash).toBe(1500 - 200)
    expect(snap.state?.turn.phase).toBe('WAITING_FOR_END_TURN')
  })

  test('8.10 REPAIR_PROPERTIES: 2 houses + 1 hotel → pays €150 (2×25 + 1×100)', async () => {
    // Chance REPAIR_PROPERTIES:0 values: 25/house, 100/hotel
    // B1: 2 houses, B2: 1 hotel → 2×25 + 1×100 = 150
    const scenario: TestScenario = {
      description: 'REPAIR_PROPERTIES with 2 houses + 1 hotel',
      rules: ['25/house 100/hotel'],
      players: [
        { cash: 1500, boardIndex: 4 },
        { cash: 1500, boardIndex: 10 },
      ],
      ownedProperties: { 0: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 2 }, B2: { hotelCount: 1 } },
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],
      forcedChanceCard: 'REPAIR_PROPERTIES:0',
      expectedAfter: {},
    }
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].cash).toBe(1500 - 150)
    expect(snap.state?.turn.phase).toBe('WAITING_FOR_END_TURN')
  })

  test('8.11 MOVE to specific spot (not GO) → moves to RR1, collects GO bonus (passes GO)', async () => {
    // MOVE:4 targets RR1 (index 5). Player is at CHANCE1 (7) when card takes effect.
    // 5 < 7 → backend treats this as passing GO → cash +200.
    // RR1 is unowned → WAITING_FOR_DECISION.
    const scenario = chanceScenario('MOVE:4')
    const snap = await runCmds(scenario, [rollAs(scenario), ackCard])
    expect(snap.state?.players[0].boardIndex).toBe(5)   // RR1
    expect(snap.state?.players[0].cash).toBe(1500 + 200)
    expect(snap.state?.turn.phase).toBe('WAITING_FOR_DECISION')
  })
})
