/**
 * PropertyDetail popup tests — clicking board spots opens the detail panel.
 *
 * Board spots have data-spot-id attributes; clicking them calls onSpotClick which
 * opens PropertyDetail. The overlay's .headerName div is unique to PropertyDetail,
 * so we use it to confirm the panel is open rather than asserting on the property
 * name text (which also appears in board spot labels).
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createBotSession, createHumanBotSession, getSnapshot,
  injectState, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

/** Selector unique to the PropertyDetail header — confirms panel is open */
const DETAIL_HEADER = '[class*=headerName]'

async function navigateSpectator(page: Page, sid: string) {
  await page.goto('/')
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

async function navigateAsHuman(page: Page, sid: string, pid: string, token: string) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, pid, token })
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

// ─── Board spot clicks ────────────────────────────────────────────────────────

test('property detail: click unowned board spot opens panel', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // B1 = Katajanokka (BROWN, unowned at game start)
    await page.locator('[data-spot-id="B1"]').click()

    // Detail header appears (class unique to PropertyDetail component)
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Ei omistajaa')).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('property detail: shows owned property without "Ei omistajaa"', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    const snap0 = await getSnapshot(sid)
    const humanSeat = snap0.state!.seats.find(s => s.playerId === humanPlayerId)!.seatIndex

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['LB1'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await page.locator('[data-spot-id="LB1"]').click()

    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Kallio' })).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Ei omistajaa')).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('property detail: closes when clicking overlay backdrop', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER)).toBeVisible({ timeout: 3000 })

    // The overlay div covers the screen; click its top-left corner to close
    await page.locator('[class*=overlay]').first().click({ position: { x: 5, y: 5 } })

    await expect(page.locator(DETAIL_HEADER)).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('property detail: can open a different spot after closing first', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // Open B1
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })

    // Close via overlay backdrop click
    await page.locator('[class*=overlay]').first().click({ position: { x: 5, y: 5 } })
    await expect(page.locator(DETAIL_HEADER)).not.toBeVisible({ timeout: 2000 })

    // Open B2 — a fresh panel with different property
    await page.locator('[data-spot-id="B2"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Kruunuhaka' })).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('property detail: railroad and utility spots open panel correctly', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // Railroad
    await page.locator('[data-spot-id="RR1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Rautatieasema' })).toBeVisible({ timeout: 3000 })
    await page.locator('[class*=overlay]').first().click({ position: { x: 5, y: 5 } })

    // Utility
    await page.locator('[data-spot-id="U1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Sähkölaitos' })).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})
