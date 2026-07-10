/**
 * Two-human-player tests — each player gets an isolated browser context
 * (separate sessionStorage, separate SSE connection).
 *
 * Commands require playerToken in the body because the session has human players:
 *   { type, actorPlayerId, playerToken, ...rest }
 */
import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import {
  createTwoHumanSession, getSnapshot, injectState, sendCmd, sendCmdRaw, deleteSession,
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

/** Returns the seatIndex (0 or 1) for a given playerId. */
function seatOf(snap: ClientSessionSnapshot, playerId: string): number {
  const seat = snap.state!.seats.find(s => s.playerId === playerId)
  if (!seat) throw new Error(`seatOf: ${playerId} not found`)
  return seat.seatIndex
}

// ─── tests ──────────────────────────────────────────────────────────────────

test('H1 rolls → H2 sees H1 cash updated via SSE', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  try {
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)

    // H1 at B1 (pos 1), dice [2,1]=3 → TAX1 (pos 4) → cash 1500-200=1300
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1500, boardIndex: 1 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 1 }],
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],
      expectedAfter: {},
    }, snap0))

    // Both navigate — H2 connects to SSE before H1 acts
    await navigateAsPlayer(page2, session.sid, session.p2)
    await expect(page2.getByTestId(`player-${h1Seat}-cash`).first()).toBeVisible({ timeout: 8000 })

    await navigateAsPlayer(page1, session.sid, session.p1)
    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-roll').first().click()

    // H1's cash drops to 1300 on TAX1; H2 sees the same update via SSE
    await expect(page1.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1300', { timeout: 5000 })
    await expect(page2.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1300', { timeout: 5000 })
  } finally {
    await ctx1.close()
    await ctx2.close()
    await deleteSession(session.sid)
  }
})

test('H1 buys property → H2 sees H1 cash decrease', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  try {
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)

    // H1 at GO (pos 0), dice [1,2]=3 → B2 (pos 3, unowned, €60) → WAITING_FOR_DECISION
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsPlayer(page2, session.sid, session.p2)
    await expect(page2.getByTestId(`player-${h1Seat}-cash`).first()).toBeVisible({ timeout: 8000 })

    await navigateAsPlayer(page1, session.sid, session.p1)
    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-roll').first().click()

    // Buy B2 for €60 → cash 1500-60=1440
    await expect(page1.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
    await page1.getByTestId('action-buy').first().click()

    // Both pages show updated cash
    await expect(page1.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1440', { timeout: 5000 })
    await expect(page2.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1440', { timeout: 5000 })
  } finally {
    await ctx1.close()
    await ctx2.close()
    await deleteSession(session.sid)
  }
})

test('H1 submits trade offer → H2 sees accept/decline buttons', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx2 = await browser.newContext()
  try {
    const page2 = await ctx2.newPage()
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)

    // H1's turn; H1 owns B1, H2 owns B2
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [h1Seat]: ['B1'], [1 - h1Seat]: ['B2'] },
      turn: { seat: h1Seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    // Use API (with token) to open, edit, and submit trade on H1's behalf
    const { p1, p2 } = session
    await sendCmd(session.sid, {
      type: 'OpenTrade', actorPlayerId: p1.playerId,
      recipientPlayerId: p2.playerId, playerToken: p1.playerToken,
    })
    const snap1 = await getSnapshot(session.sid)
    const tradeId = snap1.state!.tradeState!.tradeId
    await sendCmd(session.sid, {
      type: 'EditTradeOffer', actorPlayerId: p1.playerId, tradeId,
      patch: { offeredSide: true, propertyIdsToAdd: ['B1'] }, playerToken: p1.playerToken,
    })
    await sendCmd(session.sid, {
      type: 'SubmitTradeOffer', actorPlayerId: p1.playerId, tradeId, playerToken: p1.playerToken,
    })

    // H2 navigates — should see accept and decline buttons (trade awaiting H2's decision)
    await navigateAsPlayer(page2, session.sid, session.p2)
    await expect(page2.getByTestId('action-accept-trade').first()).toBeVisible({ timeout: 8000 })
    await expect(page2.getByTestId('action-decline-trade').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await ctx2.close()
    await deleteSession(session.sid)
  }
})

test('H2 cannot act on H1\'s turn — no roll button visible for H2', async ({ browser }) => {
  const session = await createTwoHumanSession()
  const ctx1 = await browser.newContext()
  const ctx2 = await browser.newContext()
  try {
    const [page1, page2] = await Promise.all([ctx1.newPage(), ctx2.newPage()])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)

    // H1's turn, WAITING_FOR_ROLL
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    // H1 sees roll button; H2 does not (it's not H2's turn)
    await navigateAsPlayer(page1, session.sid, session.p1)
    await navigateAsPlayer(page2, session.sid, session.p2)

    await expect(page1.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await expect(page2.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 5000 })

    // H2 also sees phase indicator showing H1 is acting
    await expect(page2.getByTestId('current-phase').first()).toBeVisible({ timeout: 3000 })

    // API-level: H2 trying to roll is rejected
    const result = await sendCmdRaw(session.sid, {
      type: 'RollDice', actorPlayerId: session.p2.playerId, playerToken: session.p2.playerToken,
    })
    expect(result.accepted).toBe(false)
  } finally {
    await ctx1.close()
    await ctx2.close()
    await deleteSession(session.sid)
  }
})
