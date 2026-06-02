import { describe, test, expect } from 'vitest'
import { runCmds, rollAs } from '../helpers/run'
import type { TestScenario } from '../helpers/scenario'

// Helper: seat0 at position 2 (COMMUNITY1), dice [2,1]=3 → position 5 (RR1).
// seat1 owns N railroads. No GO crossing (2+3=5 < 40).
function rrScenario(railroadsOwned: string[]): TestScenario {
  return {
    description: `Railroad rent: ${railroadsOwned.length} railroad(s) owned`,
    rules: ['railroad rent = 25 * 2^(n-1)'],
    players: [
      { cash: 1500, boardIndex: 2  },  // at COMMUNITY1, no effect on injection
      { cash: 1500, boardIndex: 10 },
    ],
    ownedProperties: { 1: railroadsOwned },
    turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
    forcedDice: [2, 1],  // → position 5 = RR1
    expectedAfter: {},
  }
}

// Helper: seat0 at position 9 (LB3/Hakaniemi), dice [2,1]=3 → position 12 (U1/Sähkölaitos).
// dice sum = 3, so utility rent = 4×3=12 (1 utility) or 10×3=30 (2 utilities).
function utilityScenario(utilitiesOwned: string[], expectedRent: number): TestScenario {
  return {
    description: `Utility rent: ${utilitiesOwned.length} utility(ies) owned`,
    rules: ['1 utility = 4×dice, 2 utilities = 10×dice'],
    players: [
      { cash: 1500, boardIndex: 9  },  // at LB3, no effect on injection
      { cash: 1500, boardIndex: 0  },
    ],
    ownedProperties: { 1: utilitiesOwned },
    turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
    forcedDice: [2, 1],  // sum=3, → position 12 = U1
    expectedAfter: { playerCashDelta: { 0: -expectedRent, 1: +expectedRent } },
  }
}

describe('Railroads & utilities', () => {
  test('5.1 1 railroad → rent €25', async () => {
    const scenario = rrScenario(['RR1'])
    const snap = await runCmds(scenario, [rollAs(scenario)])
    expect(snap.state?.players[0].cash).toBe(1500 - 25)
    expect(snap.state?.players[1].cash).toBe(1500 + 25)
  })

  test('5.2 2 railroads → rent €50', async () => {
    const scenario = rrScenario(['RR1', 'RR2'])
    const snap = await runCmds(scenario, [rollAs(scenario)])
    expect(snap.state?.players[0].cash).toBe(1500 - 50)
    expect(snap.state?.players[1].cash).toBe(1500 + 50)
  })

  test('5.3 3 railroads → rent €100', async () => {
    const scenario = rrScenario(['RR1', 'RR2', 'RR3'])
    const snap = await runCmds(scenario, [rollAs(scenario)])
    expect(snap.state?.players[0].cash).toBe(1500 - 100)
    expect(snap.state?.players[1].cash).toBe(1500 + 100)
  })

  test('5.4 4 railroads → rent €200', async () => {
    const scenario = rrScenario(['RR1', 'RR2', 'RR3', 'RR4'])
    const snap = await runCmds(scenario, [rollAs(scenario)])
    expect(snap.state?.players[0].cash).toBe(1500 - 200)
    expect(snap.state?.players[1].cash).toBe(1500 + 200)
  })

  test('5.5 1 utility → rent = 4 × dice sum (dice [2,1]=3 → rent 12)', async () => {
    const scenario = utilityScenario(['U1'], 12)
    const snap = await runCmds(scenario, [rollAs(scenario)])
    expect(snap.state?.players[0].cash).toBe(1500 - 12)
    expect(snap.state?.players[1].cash).toBe(1500 + 12)
  })

  test('5.6 2 utilities → rent = 10 × dice sum (dice [2,1]=3 → rent 30)', async () => {
    const scenario = utilityScenario(['U1', 'U2'], 30)
    const snap = await runCmds(scenario, [rollAs(scenario)])
    expect(snap.state?.players[0].cash).toBe(1500 - 30)
    expect(snap.state?.players[1].cash).toBe(1500 + 30)
  })
})
