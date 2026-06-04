/**
 * Cross-viewport tests — the same game flows run on three screen sizes automatically.
 *
 * Pattern: test.use({ viewport, isMobile }) inside test.describe sets the context for
 * that describe block, so one test body runs for desktop / portrait / landscape.
 *
 * Cash assertion helper switches to the players tab on mobile (player list is only
 * rendered when that tab is active) but reads directly from the always-visible
 * desktop sidebar.
 */
import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import {
  createHumanBotSession, getSnapshot, injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

// ─── viewport configs ────────────────────────────────────────────────────────

const VIEWPORTS = [
  { label: 'desktop',           vp: { width: 1280, height: 720 }, mobile: false },
  { label: 'mobile-portrait',   vp: { width: 390,  height: 844 }, mobile: true  },
  { label: 'mobile-landscape',  vp: { width: 667,  height: 375 }, mobile: true  },
] as const

// ─── helpers ─────────────────────────────────────────────────────────────────

async function navigateAsHuman(
  page: Page, sid: string, humanPlayerId: string, humanPlayerToken: string,
) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, pid: humanPlayerId, token: humanPlayerToken })
  await page.goto(`/#/game/${sid}`)
}

function humanSeatOf(snap: ClientSessionSnapshot, humanPlayerId: string): number {
  const idx = snap.state!.players.findIndex(p => p.playerId === humanPlayerId)
  if (idx === -1) throw new Error(`humanSeatOf: ${humanPlayerId} not found`)
  return idx
}

/**
 * Verify a player's cash regardless of viewport.
 * On mobile the player list renders only when the "Pelaajat" tab is active.
 * On desktop the list is always visible in the sidebar.
 */
async function verifyCash(
  page: Page, seatId: number, expectedText: string, isMobile: boolean,
) {
  if (isMobile) {
    await page.locator('button').filter({ hasText: 'Pelaajat' }).first().click()
  }
  await expect(page.getByTestId(`player-${seatId}-cash`).first()).toContainText(expectedText, { timeout: 5000 })
  if (isMobile) {
    await page.locator('button').filter({ hasText: 'Lauta' }).first().click()
  }
}

// ─── parameterised test suites ───────────────────────────────────────────────

for (const { label, vp, mobile } of VIEWPORTS) {
  test.describe(`[${label}] roll → income tax deducted`, () => {
    test.use({ viewport: vp, ...(mobile ? { isMobile: true } : {}) })

    test(`cash -200 after landing on TAX1 [${label}]`, async ({ page }) => {
      const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
      try {
        await setBotSpeed(sid, 'fast')
        const snap0 = await getSnapshot(sid)
        const humanSeat = humanSeatOf(snap0, humanPlayerId)

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
        await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
        await page.getByTestId('action-roll').first().click()
        await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })

        // Cash 1500 - 200 = 1300
        await verifyCash(page, humanSeat, '1300', mobile)
      } finally {
        await deleteSession(sid)
      }
    })
  })

  test.describe(`[${label}] buy property`, () => {
    test.use({ viewport: vp, ...(mobile ? { isMobile: true } : {}) })

    test(`buy B2 → cash -60, then end-turn available [${label}]`, async ({ page }) => {
      const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
      try {
        await setBotSpeed(sid, 'fast')
        const snap0 = await getSnapshot(sid)
        const humanSeat = humanSeatOf(snap0, humanPlayerId)

        // Human at GO, dice [1,2]=3 → B2 (pos 3, unowned, €60)
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

        await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
        await page.getByTestId('action-buy').first().click()

        // Cash 1500 - 60 = 1440
        await verifyCash(page, humanSeat, '1440', mobile)
      } finally {
        await deleteSession(sid)
      }
    })
  })

  test.describe(`[${label}] end-turn`, () => {
    test.use({ viewport: vp, ...(mobile ? { isMobile: true } : {}) })

    test(`end-turn button disappears after click [${label}]`, async ({ page }) => {
      const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
      try {
        await setBotSpeed(sid, 'fast')
        const snap0 = await getSnapshot(sid)
        const humanSeat = humanSeatOf(snap0, humanPlayerId)

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

        // Button disappears after submitting end-turn
        await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 5000 })
      } finally {
        await deleteSession(sid)
      }
    })
  })
}
