/**
 * Mobile game-action tests — extended coverage for 390×844 and landscape 667×375 viewports.
 * Complements mobile.spec.ts which covers spectator/basic roll/debt/players-tab scenarios.
 */
import { test, expect, type Page, type Browser } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import {
  createHumanBotSession, getSnapshot, injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

const PORTRAIT  = { width: 390, height: 844 }   // iPhone 14 Pro portrait
const LANDSCAPE = { width: 667, height: 375 }    // iPhone SE landscape (≤ 767px → mobile layout)

async function newCtx(browser: Browser, vp: typeof PORTRAIT) {
  return browser.newContext({ viewport: vp, isMobile: true })
}

async function navigateAsHuman(
  page: Page, sid: string, humanPlayerId: string, humanPlayerToken: string,
) {
  await page.goto('/')
  await page.evaluate(
    ({ sid, playerId, token }) => {
      sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
      sessionStorage.setItem(`monopoly_token_${sid}`, token)
    },
    { sid, playerId: humanPlayerId, token: humanPlayerToken },
  )
  await page.goto(`/#/game/${sid}`)
}

function humanSeatOf(snap: ClientSessionSnapshot, humanPlayerId: string): number {
  const idx = snap.state!.players.findIndex(p => p.playerId === humanPlayerId)
  if (idx === -1) throw new Error(`humanSeatOf: ${humanPlayerId} not found`)
  return idx
}

// ─── tests ──────────────────────────────────────────────────────────────────

test('mobile: buy property — decision panel accessible on board tab', async ({ browser }) => {
  const ctx = await newCtx(browser, PORTRAIT)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Human at GO, dice [1,2]=3 → B2 (pos 3, unowned) → WAITING_FOR_DECISION
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Buy and decline buttons both visible on mobile board tab
    await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('action-decline').first()).toBeVisible({ timeout: 2000 })

    // Buy B2 for €60 → cash 1440
    await page.getByTestId('action-buy').first().click()

    // Verify via players tab (player list only renders on mobile when players tab is active)
    await page.locator('button').filter({ hasText: 'Pelaajat' }).first().click()
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1440', { timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: end-turn button works and disappears on phone screen', async ({ browser }) => {
  const ctx = await newCtx(browser, PORTRAIT)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Human already in WAITING_FOR_END_TURN
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 20 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 20 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-end-turn').first().click()

    // Button disappears after clicking (turn passed to opponent/bot)
    await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: jail fine button accessible on phone screen', async ({ browser }) => {
  const ctx = await newCtx(browser, PORTRAIT)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Human in jail with enough cash to pay fine
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // Jail options visible on the mobile board tab
    await expect(page.getByTestId('action-pay-jail-fine').first()).toBeVisible({ timeout: 5000 })

    // Pay fine → released, roll button appears
    await page.getByTestId('action-pay-jail-fine').first().click()
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile landscape: roll button accessible in landscape orientation', async ({ browser }) => {
  // 667×375 triggers mobile landscape layout: board left column + panel right
  const ctx = await newCtx(browser, LANDSCAPE)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 20 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 20 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // Roll button accessible without switching tabs in landscape layout
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    // After roll, next action button appears
    await expect(
      page.getByTestId('action-end-turn').or(page.getByTestId('action-buy')).first()
    ).toBeVisible({ timeout: 8000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: log tab shows events after rolling dice', async ({ browser }) => {
  const ctx = await newCtx(browser, PORTRAIT)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Human at B1 (pos 1), dice [2,1]=3 → TAX1 → events generated (DICE_ROLLED, PLAYER_MOVED, cash deduct)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 1 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 1 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    // Wait for turn to resolve before switching tab
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })

    // Switch to log tab — EventLog is conditionally rendered for mobile when mobileTab==='log'.
    // The desktop sideCol also contains event-log but is hidden on mobile, so use .last()
    // to target the newly-rendered mobile instance.
    await page.locator('button').filter({ hasText: 'Loki' }).first().click()
    await expect(page.getByTestId('event-log').last()).toBeVisible({ timeout: 5000 })
    // Dice roll event (🎲 icon) always present after rolling
    await expect(page.getByTestId('event-log').last().getByText('🎲').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: board tab alert dot visible when on players tab during your turn', async ({ browser }) => {
  const ctx = await newCtx(browser, PORTRAIT)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 20 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 20 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    // Switch to players tab — it's still the human's turn
    await page.locator('button').filter({ hasText: 'Pelaajat' }).first().click()

    // Alert dot appears on board tab button when isMyTurn && mobileTab !== 'board'
    await expect(page.getByTestId('mobile-board-alert').first()).toBeVisible({ timeout: 3000 })

    // Switching back to board tab makes the alert disappear
    await page.locator('button').filter({ hasText: 'Lauta' }).first().click()
    await expect(page.getByTestId('mobile-board-alert').first()).not.toBeVisible({ timeout: 2000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})
