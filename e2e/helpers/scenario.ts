import type { ClientSessionSnapshot } from '../../src/types/api'

export interface TestScenario {
  description: string
  rules: string[]
  players: Array<{
    cash: number
    boardIndex: number
    inJail?: boolean
    /** 3 = just arrived, 2 = one turn left, 1 = last turn (auto-release next roll) */
    jailRoundsRemaining?: number
    getOutOfJailCards?: number
  }>
  /** seat-index (0, 1, 2…) → propertyId[] */
  ownedProperties?: Record<number, string[]>
  /** propertyId → attribute overrides beyond ownership */
  propertyOverrides?: Record<string, {
    mortgaged?: boolean
    houseCount?: number
    hotelCount?: number
  }>
  turn: {
    seat: number
    phase: string
    consecutiveDoubles?: number
  }
  forcedDice?: [number, number]
  forcedChanceCard?: string
  forcedCommunityCard?: string
  expectedAfter: {
    phase?: string
    /** seat-index → cash delta (positive = gain, negative = loss) */
    playerCashDelta?: Record<number, number>
    /** seat-index → expected boardIndex after action */
    playerBoardIndex?: Record<number, number>
    /** seat-index → expected inJail */
    playerInJail?: Record<number, boolean>
    /** propertyId → seat-index (null = bank / unowned) */
    propertyOwner?: Record<string, number | null>
    status?: string
  }
}

export function buildPatch(scenario: TestScenario, snap: ClientSessionSnapshot): object {
  const state = snap.state
  if (!state) throw new Error('buildPatch: snapshot has no state')
  const players = scenario.players.map((p, i) => ({
    playerId: state.players[i].playerId,
    cash: p.cash,
    boardIndex: p.boardIndex,
    inJail: p.inJail ?? false,
    // null keeps current value; set explicitly for jail tests
    jailRoundsRemaining: p.jailRoundsRemaining ?? null,
    getOutOfJailCards: p.getOutOfJailCards ?? 0,
    ownedPropertyIds: Object.entries(scenario.ownedProperties ?? {})
      .filter(([seat]) => +seat === i)
      .flatMap(([, props]) => props),
  }))

  const properties = buildPropertyPatch(scenario, snap)

  return {
    players,
    properties,
    turn: {
      activePlayerId: state.players[scenario.turn.seat].playerId,
      phase: scenario.turn.phase,
      consecutiveDoubles: scenario.turn.consecutiveDoubles ?? 0,
    },
    clearDebt: true,
    clearAuction: true,
    clearDecision: true,
    clearTrade: true,
    nextDice: scenario.forcedDice ?? null,
    nextChanceCard: scenario.forcedChanceCard ?? null,
    nextCommunityCard: scenario.forcedCommunityCard ?? null,
  }
}

function buildPropertyPatch(scenario: TestScenario, snap: ClientSessionSnapshot): object[] {
  const state = snap.state!
  // Build propertyId → playerId map from seat-indexed ownedProperties
  const ownerByPropId: Record<string, string> = {}
  for (const [seatStr, props] of Object.entries(scenario.ownedProperties ?? {})) {
    const playerId = state.players[+seatStr]?.playerId
    if (!playerId) continue
    for (const propId of props) ownerByPropId[propId] = playerId
  }

  return state.properties.map(p => {
    const overrides = scenario.propertyOverrides?.[p.propertyId] ?? {}
    const newOwner = ownerByPropId[p.propertyId]
    return {
      propertyId: p.propertyId,
      ownerPlayerId: newOwner ?? '',   // '' = clear to bank
      mortgaged: overrides.mortgaged ?? false,
      houseCount: overrides.houseCount ?? 0,
      hotelCount: overrides.hotelCount ?? 0,
    }
  })
}

/** Compute expected cash values from scenario deltas (for waitForCashValues). */
export function expectedCashValues(scenario: TestScenario): Record<number, number> {
  const result: Record<number, number> = {}
  for (const [seat, delta] of Object.entries(scenario.expectedAfter.playerCashDelta ?? {})) {
    result[+seat] = scenario.players[+seat].cash + delta
  }
  return result
}
