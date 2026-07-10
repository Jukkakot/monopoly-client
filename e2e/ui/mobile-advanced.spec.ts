/**
 * Advanced mobile tests — auctions, building, card acknowledgement, game over,
 * and cross-device (mobile + desktop) scenarios.
 */
import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import {
  createHumanBotSession, createTwoHumanSession, getSnapshot, injectState,
  setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

const PORTRAIT  = { width: 390, height: 844 }
const DESKTOP   = { width: 1280, height: 720 }

async function navigateAsHuman(
  page: Page, sid: string, pid: string, token: string,
) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, pid, token })
  await page.goto(`/#/game/${sid}`)
}

function humanSeatOf(snap: ClientSessionSnapshot, pid: string): number {
  const idx = snap.state!.players.findIndex(p => p.playerId === pid)
  if (idx === -1) throw new Error(`seat not found for ${pid}`)
  return idx
}

function seatOf(snap: ClientSessionSnapshot, pid: string): number {
  return snap.state!.seats.find(s => s.playerId === pid)!.seatIndex
}

// ─── tests ──────────────────────────────────────────────────────────────────

test('mobile: auction panel accessible after declining purchase', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: PORTRAIT, isMobile: true })
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Human at GO, dice [3,2]=5 → RR1 (pos 5, unowned) → WAITING_FOR_DECISION
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Decision panel: buy or decline — both visible on mobile board tab
    await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-decline').first().click()

    // Auction starts — pass button accessible on mobile
    await expect(page.getByTestId('action-pass-auction').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: buy house via properties sub-tab', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: PORTRAIT, isMobile: true })
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Human owns full BROWN monopoly (B1+B2), WAITING_FOR_END_TURN
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 20 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 20 }],
      ownedProperties: { [humanSeat]: ['B1', 'B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // tab-properties appears in ActionPanel (on the mobile board tab)
    await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tab-properties').first().click()

    // BuildingButtons rendered: buy-house button for B1 visible
    await expect(page.getByTestId('action-buy-house-B1').first()).toBeVisible({ timeout: 5000 })

    // Buy a house on B1 — housePrice for BROWN = €50
    await page.getByTestId('action-buy-house-B1').first().click()

    // Cash decreased: 1500 - 50 = 1450 (check via players tab)
    await page.locator('button').filter({ hasText: 'Pelaajat' }).first().click()
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1450', { timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: chance card popup tap-to-acknowledge on phone screen', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: PORTRAIT, isMobile: true })
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Human at pos 4 (TAX1), dice [2,1]=3 → CHANCE1 (pos 7), card MONEY:0 (+€150)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 4 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 4 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],
      forcedChanceCard: 'MONEY:0',
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Card popup appears on mobile (WAITING_FOR_CARD_ACK) — whole panel is tappable
    // The popup shows the card icon 🃏 and the "✓ Selvä" confirm button
    await expect(page.getByText('✓ Selvä').first()).toBeVisible({ timeout: 5000 })
    await page.getByText('✓ Selvä').first().click()

    // Card acknowledged → cash +150 = 1650 (check via players tab)
    await page.locator('button').filter({ hasText: 'Pelaajat' }).first().click()
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1650', { timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: game over winner overlay visible on phone screen', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: PORTRAIT, isMobile: true })
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat
    const page = await ctx.newPage()

    // Human €1 no props, bot owns B1+B2 with hotel → hotel rent >> €1 → bankruptcy
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['B1', 'B2'] },
      propertyOverrides: { B2: { hotelCount: 1 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await page.getByTestId('action-declare-bankruptcy-trigger').first().click()
    await expect(page.getByTestId('action-declare-bankruptcy').first()).toBeVisible({ timeout: 3000 })
    await page.getByTestId('action-declare-bankruptcy').first().click()

    // Game over overlay visible on mobile phone screen
    await expect(page.getByTestId('game-status').first()).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 10000 })
    await expect(page.getByTestId('game-over-winner').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('cross-device: mobile player and desktop player see each other\'s moves', async ({ browser }) => {
  const mobileCtx = await browser.newContext({ viewport: PORTRAIT, isMobile: true })
  const desktopCtx = await browser.newContext({ viewport: DESKTOP })
  const session = await createTwoHumanSession()
  try {
    const [mobilePage, desktopPage] = await Promise.all([
      mobileCtx.newPage(), desktopCtx.newPage(),
    ])
    const snap0 = await getSnapshot(session.sid)
    const h1Seat = seatOf(snap0, session.p1.playerId)
    const h2Seat = seatOf(snap0, session.p2.playerId)

    // H1 (mobile) at B1 (pos 1), dice [2,1]=3 → TAX1 (pos 4, -€200)
    await injectState(session.sid, buildPatch({
      description: '', rules: [],
      players: h1Seat === 0
        ? [{ cash: 1500, boardIndex: 1 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 1 }],
      turn: { seat: h1Seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],
      expectedAfter: {},
    }, snap0))

    // H2 (desktop) navigates first to catch SSE events
    await navigateAsHuman(desktopPage, session.sid, session.p2.playerId, session.p2.playerToken)
    await expect(desktopPage.getByTestId(`player-${h2Seat}-cash`).first()).toBeVisible({ timeout: 8000 })

    // H1 (mobile) navigates and rolls
    await navigateAsHuman(mobilePage, session.sid, session.p1.playerId, session.p1.playerToken)
    await expect(mobilePage.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await mobilePage.getByTestId('action-roll').first().click()

    // H1 mobile: cash 1300 (visible via players tab switch)
    await mobilePage.locator('button').filter({ hasText: 'Pelaajat' }).first().click()
    await expect(mobilePage.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1300', { timeout: 5000 })

    // H2 desktop: same cash update received via SSE (desktop sidebar always visible)
    await expect(desktopPage.getByTestId(`player-${h1Seat}-cash`).first()).toContainText('1300', { timeout: 5000 })

    // H2 desktop: sees H1's turn phase ended (current-phase shows H2 or end-turn visible for H1)
    // H1 on mobile sees the board tab shows end-turn on switching back
    await mobilePage.locator('button').filter({ hasText: 'Lauta' }).first().click()
    await expect(mobilePage.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await mobileCtx.close()
    await desktopCtx.close()
    await deleteSession(session.sid)
  }
})
