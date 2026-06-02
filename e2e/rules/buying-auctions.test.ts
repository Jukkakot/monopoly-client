import { describe, test, expect } from 'vitest'
import { createBotSession, getSnapshot, injectState, sendCmd, sendCmdRaw, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'
import { runCmds, rollAs } from '../helpers/run'
import type { CmdFactory } from '../helpers/run'
import { buyPropertyScenario } from '../scenarios/buying/buy-property'
import { declineToAuctionScenario } from '../scenarios/buying/decline-to-auction'
import { winAuctionScenario } from '../scenarios/buying/win-auction'
import { allPassAuctionScenario } from '../scenarios/buying/all-pass-auction'
import { ineligibleBidderScenario } from '../scenarios/buying/ineligible-bidder'
import { noEligibleBiddersScenario } from '../scenarios/buying/no-eligible-bidders'
import type { ClientSessionSnapshot } from '../../src/types/api'

const decline: CmdFactory = (ids, snap) => ({
  type: 'DeclineProperty',
  actorPlayerId: ids[0],
  decisionId: snap.state!.pendingDecision!.decisionId,
  propertyId: snap.state!.pendingDecision!.payload.propertyId,
})

const buyIt: CmdFactory = (ids, snap) => ({
  type: 'BuyProperty',
  actorPlayerId: ids[0],
  decisionId: snap.state!.pendingDecision!.decisionId,
  propertyId: snap.state!.pendingDecision!.payload.propertyId,
})

// Bid €10 as current auction actor
const bid10: CmdFactory = (_, snap) => ({
  type: 'PlaceAuctionBid',
  actorPlayerId: snap.state!.auctionState!.currentActorPlayerId,
  auctionId: snap.state!.auctionState!.auctionId,
  amount: 10,
})

// Pass as current auction actor
const passAuction: CmdFactory = (_, snap) => ({
  type: 'PassAuction',
  actorPlayerId: snap.state!.auctionState!.currentActorPlayerId,
  auctionId: snap.state!.auctionState!.auctionId,
})

const finishAuction: CmdFactory = (_, snap) => ({
  type: 'FinishAuctionResolution',
  actorPlayerId: snap.state!.auctionState!.currentActorPlayerId,
  auctionId: snap.state!.auctionState!.auctionId,
})

describe('Buying & auction', () => {
  test('3.1 buy property at list price → owned, cash decreases', async () => {
    const snap = await runCmds(buyPropertyScenario, [rollAs(buyPropertyScenario), buyIt])
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    const seat0Id = snap.state!.players[0].playerId
    expect(b2.ownerPlayerId).toBe(seat0Id)
    expect(snap.state?.players[0].cash).toBe(buyPropertyScenario.players[0].cash - 60)
  })

  test('3.2 decline purchase → WAITING_FOR_AUCTION, minimumNextBid=10', async () => {
    const snap = await runCmds(declineToAuctionScenario, [rollAs(declineToAuctionScenario), decline])
    expect(snap.state?.turn?.phase).toBe('WAITING_FOR_AUCTION')
    expect(snap.state?.auctionState?.minimumNextBid).toBe(10)
    expect(snap.state?.auctionState?.propertyId).toBe('B2')
  })

  test('3.3 win auction → property owned by winning bidder', async () => {
    // Flow: roll → decline → currentActor bids €10 → other actor passes → finish
    const snap = await runCmds(winAuctionScenario, [
      rollAs(winAuctionScenario),
      decline,
      bid10,
      passAuction,
      finishAuction,
    ])
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    expect(b2.ownerPlayerId).not.toBeNull()
    // Winner paid €10 for B2
    const winnerIdx = snap.state!.players.findIndex(p => p.playerId === b2.ownerPlayerId)
    expect(snap.state!.players[winnerIdx].cash).toBe(winAuctionScenario.players[winnerIdx].cash - 10)
  })

  test('3.4 all players pass auction → property stays unowned', async () => {
    // Both players pass → property stays with bank
    const snap = await runCmds(allPassAuctionScenario, [
      rollAs(allPassAuctionScenario),
      decline,
      passAuction,  // first actor passes
      passAuction,  // second actor passes (if 2-player, may auto-resolve)
    ])
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    expect(b2.ownerPlayerId).toBeNull()
  })

  test('3.5 player with < €10 is ineligible to bid', async () => {
    const snap = await runCmds(ineligibleBidderScenario, [rollAs(ineligibleBidderScenario), decline])
    const auction = snap.state!.auctionState!
    const broke = snap.state!.players[0].playerId  // seat0 has €5
    expect(auction.eligiblePlayerIds).not.toContain(broke)
    expect(auction.eligiblePlayerIds).toHaveLength(1)  // only seat1 eligible
  })

  test('3.6 no eligible bidders → no auction, property stays unowned', async () => {
    // Backend auto-ends the turn when no eligible bidders exist.
    const snap = await runCmds(noEligibleBiddersScenario, [rollAs(noEligibleBiddersScenario), decline])
    expect(snap.state?.auctionState).toBeNull()
    const b2 = snap.state!.properties.find(p => p.propertyId === 'B2')!
    expect(b2.ownerPlayerId).toBeNull()
  })
})
