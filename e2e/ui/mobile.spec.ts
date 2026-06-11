/**
 * Mobile viewport tests — iPhone 14 Pro dimensions (390×844).
 * Width ≤ 767 triggers the mobile layout in AppLayout:
 *   - Bottom tab navigation (🎲 Lauta / 👥 Pelaajat / 📋 Loki)
 *   - Action panel lives inside the board tab
 *   - Player list only rendered when players tab is active
 *   - Cash bar chip strip shown on board tab
 */
import { test, expect, type Page, type Browser } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import {
  createHumanBotSession, createBotSession, getSnapshot, injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

// iPhone 14 Pro — triggers mobile layout (<= 767 px)
const MOBILE = { width: 390, height: 844 }

async function newMobileCtx(browser: Browser) {
  return browser.newContext({ viewport: MOBILE, isMobile: true })
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

test('mobile: spectator view loads correctly on phone screen', async ({ browser }) => {
  const ctx = await newMobileCtx(browser)
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    const page = await ctx.newPage()
    await page.goto(`/#/game/${sid}`)

    // Spectator label visible
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })
    // Active phase indicator present in the spectator action panel
    await expect(page.getByTestId('current-phase').first()).toBeVisible({ timeout: 5000 })
    // Bottom tab navigation rendered (mobile layout active)
    await expect(page.locator('button').filter({ hasText: 'Lauta' }).first()).toBeVisible({ timeout: 3000 })
    await expect(page.locator('button').filter({ hasText: 'Pelaajat' }).first()).toBeVisible({ timeout: 2000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: roll button accessible on default board tab', async ({ browser }) => {
  const ctx = await newMobileCtx(browser)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // sum=3 → own-property scenario via B2 if owned, else free landing
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // Board tab is default — action-roll must be accessible without switching tabs
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: players tab navigation shows player cash values', async ({ browser }) => {
  const ctx = await newMobileCtx(browser)
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const page = await ctx.newPage()

    // Inject distinctive cash values
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [{ cash: 1234, boardIndex: 0 }, { cash: 5678, boardIndex: 10 }],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await page.goto(`/#/game/${sid}`)
    // Wait for spectator label
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    // Switch to players tab — player list only renders on mobile when this tab is active
    await page.locator('button').filter({ hasText: 'Pelaajat' }).first().click()

    // Both injected cash values appear after tab switch
    await expect(page.getByTestId('player-0-cash').first()).toContainText('1234', { timeout: 5000 })
    await expect(page.getByTestId('player-1-cash').first()).toContainText('5678', { timeout: 3000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: income tax deducted — visible via players tab', async ({ browser }) => {
  const ctx = await newMobileCtx(browser)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const page = await ctx.newPage()

    // Position 1 (B1), dice [2,1]=3 → position 4 = TAX1 (Tulovero, -€200)
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

    // Roll on board tab
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })

    // Switch to players tab to verify updated cash (1500-200=1300)
    await page.locator('button').filter({ hasText: 'Pelaajat' }).first().click()
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1300', { timeout: 5000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})

test('mobile: debt panel visible when cannot pay rent', async ({ browser }) => {
  const ctx = await newMobileCtx(browser)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat
    const page = await ctx.newPage()

    // Human €1, bot owns B2 with hotel (rent >> €1 → debt)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['B1', 'B2'] },
      propertyOverrides: { B2: { hotelCount: 1 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // sum=3 → B2 (bot hotel → RESOLVING_DEBT)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Debt panel appears on the board tab in the mobile action area
    await expect(page.getByTestId('debt-panel').first()).toBeVisible({ timeout: 8000 })
    // Declare bankruptcy trigger button accessible on mobile (first step of two-step confirmation)
    await expect(page.getByTestId('action-declare-bankruptcy-trigger').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await ctx.close()
    await deleteSession(sid)
  }
})
