/**
 * Extended 2-human multiplayer tests — scenarios not covered by single-human+bot tests.
 *
 * Session setup: createTwoHumanSession() → no bots, no auto-advance.
 * Commands with actorPlayerId require playerToken in the body.
 * FinishAuctionResolution only needs auctionId (no actorPlayerId auth check).
 */
import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import {
  createTwoHumanSession, getSnapshot, injectState, sendCmd, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

// ─── helpers ────────────────────────────────────────────────────────────────

async function navigateAsPlayer(
  page: Page,
  sid: string,
  player: { playerId: string; playerToken: string },
) {
  await page.goto('/')
  await page.evaluate(
    ({ sid, playerId, token }) => {
      sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
      sessionStorage.setItem(`monopoly_token_${sid}`, token)
    },
    { sid, playerId: player.playerId, token: player.playerToken },
  )
  await page.goto(`/#/game/${sid}`)
}

function seatOf(snap: ClientSessionSnapshot, playerId: string): number {
  return snap.state!.seats.find(s => s.playerId === playerId)!.seatIndex
}

// ─── tests ──────────────────────────────────────────────────────────────────

test('human landlord: H1 lands on H2 railroad → rent flows H1→H2', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  try {
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)
    const h2Seat = seatOf(snap0, session.p2.playerId)

    // H2 owns RR1 (position 5, 1 railroad → rent €25)
    // players array is ordered by seatIndex: index 0 = seat 0, index 1 = seat 1
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [h2Seat]: ['RR1'] },
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],  // sum=5 → 0+5=5=RR1 (H2 owns, 1 railroad → €25)
      expectedAfter: {},
    }, snap0))

    // H2 connects via SSE first
    await navigateAsPlayer(page2, session.sid, session.p2)
    await expect(page2.getByTestId(`player-${h2Seat}-cash`).first()).toBeVisible({ timeout: 8000 })

    await navigateAsPlayer(page1, session.sid, session.p1)
    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-roll').first().click()

    // Rent paid: H1 cash = 1500-25 = 1475, H2 cash = 1500+25 = 1525
    await expect(page1.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1475', { timeout: 5000 })
    await expect(page1.getByTestId(`player-${h2Seat}-cash`).first()).toContainText('1525', { timeout: 3000 })
    // H2's own page also reflects the update via SSE
    await expect(page2.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1475', { timeout: 5000 })
    await expect(page2.getByTestId(`player-${h2Seat}-cash`).first()).toContainText('1525', { timeout: 3000 })
  } finally {
    await ctx1.close()
    await ctx2.close()
    await deleteSession(session.sid)
  }
})

test('H1 cannot pay H2 rent → debt panel for H1, H2 cannot act', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  try {
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)
    const h2Seat = seatOf(snap0, session.p2.playerId)

    // H2 owns B1+B2 with hotel on B2 (hotel rent >> €10 → RESOLVING_DEBT for H1)
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 10, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 10, boardIndex: 0 }],
      ownedProperties: { [h2Seat]: ['B1', 'B2'] },
      propertyOverrides: { B2: { hotelCount: 1 } },
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // sum=3 → B2 (H2 hotel → RESOLVING_DEBT)
      expectedAfter: {},
    }, snap0))

    await navigateAsPlayer(page2, session.sid, session.p2)
    await navigateAsPlayer(page1, session.sid, session.p1)

    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-roll').first().click()

    // H1 in debt — debt panel visible only to H1 (the debtor)
    await expect(page1.getByTestId('debt-panel').first()).toBeVisible({ timeout: 8000 })

    // H2 is blocked: not H2's turn and H1 must resolve debt first
    await expect(page2.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 3000 })
    await expect(page2.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 2000 })
  } finally {
    await ctx1.close()
    await ctx2.close()
    await deleteSession(session.sid)
  }
})

test("H2's turn: H1 sees phase indicator, H2 rolls and ends turn, H1 gets roll", async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  try {
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)
    const h2Seat = seatOf(snap0, session.p2.playerId)

    // H2's turn; H2 at pos 15, owns RR2, dice [2,3]=5 → FREE_PARKING (pos 20)
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h2Seat === 0
        ? [{ cash: 1500, boardIndex: 15 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 15 }],
      ownedProperties: { [h2Seat]: ['RR2'] },
      turn: { seat: h2Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 3],  // sum=5 → 15+5=20=FREE_PARKING
      expectedAfter: {},
    }, snap0))

    await navigateAsPlayer(page1, session.sid, session.p1)
    await navigateAsPlayer(page2, session.sid, session.p2)

    // H1 sees phase indicator (H2 is active) but no action buttons
    await expect(page1.getByTestId('current-phase').first()).toBeVisible({ timeout: 5000 })
    await expect(page1.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 3000 })

    // H2 rolls to FREE_PARKING, then ends turn
    await expect(page2.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page2.getByTestId('action-roll').first().click()
    await expect(page2.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 8000 })
    await page2.getByTestId('action-end-turn').first().click()

    // No bots → H1's turn resumes immediately after H2 ends
    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await expect(page2.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 3000 })
  } finally {
    await ctx1.close()
    await ctx2.close()
    await deleteSession(session.sid)
  }
})

test('auction: H1 declines, H2 wins with higher bid → H2 owns property', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  try {
    const page1 = await ctx1.newPage()
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)
    const h2Seat = seatOf(snap0, session.p2.playerId)

    // H1 at GO, dice [3,2]=5 → RR1 (unowned) → H1 will decline
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsPlayer(page1, session.sid, session.p1)
    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-roll').first().click()

    // H1 declines purchase → auction starts
    await expect(page1.getByTestId('action-decline').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-decline').first().click()

    // Drive auction via API: H1 bids 10, H2 bids 25, H1 passes, H2 finishes
    const snapAuction = await getSnapshot(session.sid)
    const auctionId = snapAuction.state!.auctionState!.auctionId
    const { p1, p2 } = session
    await sendCmd(session.sid, {
      type: 'PlaceAuctionBid', actorPlayerId: p1.playerId, auctionId, amount: 10, playerToken: p1.playerToken,
    })
    await sendCmd(session.sid, {
      type: 'PlaceAuctionBid', actorPlayerId: p2.playerId, auctionId, amount: 25, playerToken: p2.playerToken,
    })
    await sendCmd(session.sid, {
      type: 'PassAuction', actorPlayerId: p1.playerId, auctionId, playerToken: p1.playerToken,
    })
    // FinishAuctionResolution has no actorPlayerId — winner is determined by auction state
    await sendCmd(session.sid, { type: 'FinishAuctionResolution', auctionId, playerToken: p2.playerToken })

    // H1's page (via SSE): H2 paid €25 for RR1 → H2 cash = 1475
    await expect(page1.getByTestId(`player-${h2Seat}-cash`).first()).toContainText('1475', { timeout: 5000 })
  } finally {
    await ctx1.close()
    await deleteSession(session.sid)
  }
})

test('H1 bankrupts to H2 → both pages show H2 as winner', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  try {
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)
    const h2Seat = seatOf(snap0, session.p2.playerId)

    // H1 €1 no props; H2 owns B1+B2 with hotel on B2 (hotel rent >> €1 → bankruptcy)
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1, boardIndex: 0 }],
      ownedProperties: { [h2Seat]: ['B1', 'B2'] },
      propertyOverrides: { B2: { hotelCount: 1 } },
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // sum=3 → B2 (H2 hotel → RESOLVING_DEBT)
      expectedAfter: {},
    }, snap0))

    // H2 connects first to catch the GAME_OVER SSE event
    await navigateAsPlayer(page2, session.sid, session.p2)
    await expect(page2.getByTestId(`player-${h2Seat}-cash`).first()).toBeVisible({ timeout: 8000 })

    await navigateAsPlayer(page1, session.sid, session.p1)
    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-roll').first().click()

    // H1 declares bankruptcy to H2 → game over
    await expect(page1.getByTestId('action-declare-bankruptcy').first()).toBeVisible({ timeout: 8000 })
    await page1.getByTestId('action-declare-bankruptcy').first().click()

    // Both pages show GAME_OVER and winner overlay
    await expect(page1.getByTestId('game-status').first()).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 10000 })
    await expect(page1.getByTestId('game-over-winner').first()).toBeVisible({ timeout: 3000 })
    await expect(page2.getByTestId('game-status').first()).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 5000 })
    await expect(page2.getByTestId('game-over-winner').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await ctx1.close()
    await ctx2.close()
    await deleteSession(session.sid)
  }
})
