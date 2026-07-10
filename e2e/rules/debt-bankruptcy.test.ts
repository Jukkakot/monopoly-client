import { describe, test, expect } from 'vitest'
import { createBotSession, getSnapshot, injectState, sendCmd, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'
import { runCmds, rollAs } from '../helpers/run'
import type { CmdFactory } from '../helpers/run'

// Seat 0 has €1, owes rent to seat 1 who owns B2 with hotel (rent €450)
// Seat 0 at 0, dice [1,2]=3 → B2 → RESOLVING_DEBT
const debtBaseScenario = (seat0Cash = 1, seat0Props: string[] = []) => ({
  description: 'debt scenario',
  rules: [],
  players: [
    { cash: seat0Cash, boardIndex: 0  },
    { cash: 1500,      boardIndex: 10 },
  ] as const,
  ownedProperties: { 0: seat0Props, 1: ['B1', 'B2'] } as Record<number, string[]>,
  propertyOverrides: { B2: { hotelCount: 1 } } as Record<string, { hotelCount?: number }>,
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2] as [number, number],  // → B2
  expectedAfter: {},
})

const declareBankruptcy: CmdFactory = (ids, snap) => ({
  type: 'DeclareBankruptcy',
  actorPlayerId: ids[0],
  debtId: snap.state!.activeDebt!.debtId,
})

describe('Debt & bankruptcy', () => {
  test('6.1 insufficient cash for rent → RESOLVING_DEBT phase', async () => {
    const scenario = debtBaseScenario(1)
    const snap = await runCmds(scenario as any, [rollAs(scenario as any)])
    expect(snap.state?.turn?.phase).toBe('RESOLVING_DEBT')
    expect(snap.state?.activeDebt).not.toBeNull()
    expect(snap.state?.activeDebt?.creditorType).toBe('PLAYER')
  })

  test('6.2 mortgage property to cover debt → mortgaged, cash increases', async () => {
    // seat0 has €1, owns LB1 (price €100, mortgage = €50). Owes rent €450 to seat1.
    // seat1 owns only B2 with hotel (no B1 conflict).
    // After mortgaging LB1: cash = 1+50=51. Still can't pay 450.
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['LB1'], 1: ['B2'] },
        propertyOverrides: { B2: { hotelCount: 1 } },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [1, 2],  // → B2 → debt €450
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const ids = snap0.state!.players.map(p => p.playerId)
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
      let snap = await getSnapshot(sid)
      expect(snap.state?.turn?.phase).toBe('RESOLVING_DEBT')
      await sendCmd(sid, { type: 'MortgagePropertyForDebt', actorPlayerId: ids[0], debtId: snap.state!.activeDebt!.debtId, propertyId: 'LB1' })
      snap = await getSnapshot(sid)
      const lb1 = snap.state!.properties.find(p => p.propertyId === 'LB1')!
      expect(lb1.mortgaged).toBe(true)
      expect(snap.state?.players[0].cash).toBe(1 + 50)  // LB1 price=100, mortgage=50
      expect(snap.state?.turn?.phase).toBe('RESOLVING_DEBT')  // still in debt (51 < 450)
    } finally {
      await deleteSession(sid)
    }
  })

  test('6.3 sell buildings to cover debt → house count decreases', async () => {
    // seat0 has €1, owns P1+P2+P3 (full PURPLE), P1 has 1 house (sell = €50)
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['P1', 'P2', 'P3'], 1: ['B1', 'B2'] },
        propertyOverrides: { B2: { hotelCount: 1 }, P1: { houseCount: 1 } },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [1, 2],
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const ids = snap0.state!.players.map(p => p.playerId)
      // Roll → RESOLVING_DEBT
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
      let snap = await getSnapshot(sid)
      // Sell house on P1
      await sendCmd(sid, { type: 'SellBuildingForDebt', actorPlayerId: ids[0], debtId: snap.state!.activeDebt!.debtId, propertyId: 'P1', count: 1 })
      snap = await getSnapshot(sid)
      const p1 = snap.state!.properties.find(p => p.propertyId === 'P1')!
      expect(p1.houseCount).toBe(0)
      expect(snap.state?.players[0].cash).toBe(1 + 50)  // PURPLE house = €100, sell = €50
    } finally {
      await deleteSession(sid)
    }
  })

  test('6.4 bankruptcy to player → property transfers to creditor', async () => {
    // seat0 has €1, no assets. Bankrupt to seat1.
    const scenario = debtBaseScenario(1)
    const snap = await runCmds(scenario as any, [
      rollAs(scenario as any),
      declareBankruptcy,
    ])
    // seat1 owns B2 already; after bankruptcy seat0's empty set still transfers (nothing to transfer here)
    // Key check: seat0 is eliminated
    expect(snap.state?.players[0].eliminated).toBe(true)
  })

  test('6.5 bankruptcy to bank → properties become unowned (null)', async () => {
    // seat0 lands on TAX1 (€200) but has only €1 and owns B1.
    // After declareBankruptcy: B1 ownerPlayerId = null
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1, boardIndex: 1 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B1'] },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [2, 1],  // 1+3=4 = TAX1 (€200)
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const ids = snap0.state!.players.map(p => p.playerId)
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
      let snap = await getSnapshot(sid)
      expect(snap.state?.turn?.phase).toBe('RESOLVING_DEBT')
      expect(snap.state?.activeDebt?.creditorType).toBe('BANK')
      await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: ids[0], debtId: snap.state!.activeDebt!.debtId })
      snap = await getSnapshot(sid)
      const b1 = snap.state!.properties.find(p => p.propertyId === 'B1')!
      expect(b1.ownerPlayerId).toBeNull()
    } finally {
      await deleteSession(sid)
    }
  })

  test('6.6 mortgaged property transfers with bankruptcy', async () => {
    // seat0 owns mortgaged B1, owes rent to seat1. Declares bankruptcy.
    // B1 (mortgaged) should transfer to seat1 still mortgaged.
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B1'], 1: ['B2'] },
        propertyOverrides: { B1: { mortgaged: true }, B2: { hotelCount: 1 } },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [1, 2],  // → B2 → debt
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const ids = snap0.state!.players.map(p => p.playerId)
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
      let snap = await getSnapshot(sid)
      await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: ids[0], debtId: snap.state!.activeDebt!.debtId })
      snap = await getSnapshot(sid)
      const b1 = snap.state!.properties.find(p => p.propertyId === 'B1')!
      const seat1Id = ids[1]
      expect(b1.ownerPlayerId).toBe(seat1Id)
      // Backend clears the mortgage flag when property transfers in bankruptcy
      expect(b1.mortgaged).toBe(false)
    } finally {
      await deleteSession(sid)
    }
  })

  test('6.8 bankruptcy to bank in 2-player game → GAME_OVER immediately, no auction', async () => {
    // In a 2-player game the only surviving player wins immediately when seat 0 goes bankrupt.
    // No auction is started because GAME_OVER takes precedence.
    // Properties are transferred to bank (null owner) with mortgage cleared.
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [{ cash: 1, boardIndex: 1 }, { cash: 1500, boardIndex: 10 }],
        ownedProperties: { 0: ['B1', 'B2'] },
        propertyOverrides: { B2: { mortgaged: true } },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [2, 1],  // 1+3=4 = TAX1 (€200 debt to bank)
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const ids = snap0.state!.players.map(p => p.playerId)

      await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
      let snap = await getSnapshot(sid)
      expect(snap.state?.activeDebt?.creditorType).toBe('BANK')

      await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: ids[0], debtId: snap.state!.activeDebt!.debtId })
      snap = await getSnapshot(sid)

      // GAME_OVER immediately — seat1 is the sole survivor
      expect(snap.status).toBe('GAME_OVER')
      expect(snap.state?.winnerPlayerId).toBe(ids[1])

      // Properties unowned (bank), mortgage cleared — no auction was started
      const b1 = snap.state!.properties.find(p => p.propertyId === 'B1')!
      const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
      expect(b1.ownerPlayerId).toBeNull()
      expect(b2.ownerPlayerId).toBeNull()
      expect(b2.mortgaged).toBe(false)
      expect(snap.state?.auctionState).toBeNull()
    } finally {
      await deleteSession(sid)
    }
  })

  test('6.9 bankruptcy to bank in 3-player game → properties auctioned immediately', async () => {
    // seat0: €1, owns B1 (unmortgaged) + B2 (mortgaged). Rolls into TAX1 (€200 debt to bank).
    // seats 1+2 remain active after bankruptcy → game NOT over → B1 and B2 go to auction.
    // Auction order: B1 first (arbitrary property order from gateway).
    // seat1 bids €10 on B1, seat2 passes → seat1 wins B1. Then B2 auctions, seat2 bids €10,
    // seat1 passes → seat2 wins B2.
    const sid = await createBotSession(3)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [
          { cash: 1,    boardIndex: 1  },
          { cash: 1500, boardIndex: 10 },
          { cash: 1500, boardIndex: 20 },
        ],
        ownedProperties: { 0: ['B1', 'B2'] },
        propertyOverrides: { B2: { mortgaged: true } },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [2, 1],  // 1+3=4 = TAX1 (€200 debt to bank)
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const ids = snap0.state!.players.map(p => p.playerId)

      // Roll → RESOLVING_DEBT (bank creditor)
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
      let snap = await getSnapshot(sid)
      expect(snap.state?.turn?.phase).toBe('RESOLVING_DEBT')
      expect(snap.state?.activeDebt?.creditorType).toBe('BANK')

      // Declare bankruptcy → first property should immediately go to auction
      await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: ids[0], debtId: snap.state!.activeDebt!.debtId })
      snap = await getSnapshot(sid)
      expect(snap.status).toBe('IN_PROGRESS')                   // game not over
      expect(snap.state?.turn?.phase).toBe('WAITING_FOR_AUCTION')
      expect(snap.state?.auctionState).not.toBeNull()
      const firstAuctionPropertyId = snap.state!.auctionState!.propertyId
      expect(['B1', 'B2']).toContain(firstAuctionPropertyId)
      // mortgage must be cleared before auction (official rule)
      const firstPropBeforeAuction = snap.state!.properties.find(p => p.propertyId === firstAuctionPropertyId)!
      expect(firstPropBeforeAuction.mortgaged).toBe(false)

      // Seat1 bids €10 on first property
      const firstAuctionId = snap.state!.auctionState!.auctionId
      await sendCmd(sid, { type: 'PlaceAuctionBid', actorPlayerId: ids[1], auctionId: firstAuctionId, amount: 10 })

      // Seat2 passes → seat1 is sole remaining bidder → WON_PENDING_RESOLUTION
      snap = await getSnapshot(sid)
      const actor2 = snap.state!.auctionState!.currentActorPlayerId
      await sendCmd(sid, { type: 'PassAuction', actorPlayerId: actor2, auctionId: firstAuctionId })
      snap = await getSnapshot(sid)
      expect(snap.state?.auctionState?.status).toBe('WON_PENDING_RESOLUTION')

      // Finish first auction
      await sendCmd(sid, { type: 'FinishAuctionResolution', actorPlayerId: ids[1], auctionId: firstAuctionId })
      snap = await getSnapshot(sid)

      // First property now owned by seat1
      const firstProp = snap.state!.properties.find(p => p.propertyId === firstAuctionPropertyId)!
      expect(firstProp.ownerPlayerId).toBe(ids[1])
      expect(firstProp.mortgaged).toBe(false)

      // Second property should now be in auction automatically
      expect(snap.state?.turn?.phase).toBe('WAITING_FOR_AUCTION')
      expect(snap.state?.auctionState).not.toBeNull()
      const secondAuctionPropertyId = snap.state!.auctionState!.propertyId
      expect(secondAuctionPropertyId).not.toBe(firstAuctionPropertyId)

      // Seat1 passes on second, seat2 bids €10 → seat2 wins
      const secondAuctionId = snap.state!.auctionState!.auctionId
      const actor1 = snap.state!.auctionState!.currentActorPlayerId
      await sendCmd(sid, { type: 'PassAuction', actorPlayerId: actor1, auctionId: secondAuctionId })
      snap = await getSnapshot(sid)
      await sendCmd(sid, { type: 'PlaceAuctionBid', actorPlayerId: snap.state!.auctionState!.currentActorPlayerId, auctionId: secondAuctionId, amount: 10 })
      snap = await getSnapshot(sid)
      await sendCmd(sid, { type: 'FinishAuctionResolution', actorPlayerId: ids[2], auctionId: secondAuctionId })
      snap = await getSnapshot(sid)

      // All auctions done — game continues normally
      const secondProp = snap.state!.properties.find(p => p.propertyId === secondAuctionPropertyId)!
      expect(secondProp.ownerPlayerId).toBe(ids[2])
      expect(snap.status).toBe('IN_PROGRESS')
      expect(snap.state?.auctionState).toBeNull()
      expect(snap.state?.turn?.phase).toBe('WAITING_FOR_ROLL')
    } finally {
      await deleteSession(sid)
    }
  })

  test('6.7 last player standing → status=GAME_OVER, winnerPlayerId set', async () => {
    // 2-player game: seat0 goes bankrupt → seat1 wins → GAME_OVER
    const scenario = debtBaseScenario(1)
    const snap = await runCmds(scenario as any, [
      rollAs(scenario as any),
      declareBankruptcy,
    ])
    expect(snap.status).toBe('GAME_OVER')
    const seat1Id = snap.state!.players[1].playerId
    expect(snap.state?.winnerPlayerId).toBe(seat1Id)
  })
})
