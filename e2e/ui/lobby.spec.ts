/**
 * Lobby flow tests — the first thing every user sees.
 * Covers SessionListScreen (/), LobbyScreen (/lobby) and LobbyWaitingScreen (/lobby-wait/:id).
 * All tests run on a mobile viewport (390×844) since that's the primary target device.
 *
 * These tests create real sessions via the UI (no API shortcuts).
 * Session IDs are extracted from the URL after navigation and cleaned up.
 */
import { test, expect, type Page, type Browser } from '@playwright/test'
import { deleteSession } from '../helpers/api'

const MOBILE = { width: 390, height: 844 }

async function mobilePage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ viewport: MOBILE, isMobile: true })
  return ctx.newPage()
}

/** Extract session ID from a URL that ends with /game/:id or /lobby-wait/:id */
function sidFromUrl(url: string): string | null {
  const m = url.match(/\/(game|lobby-wait)\/([^/#?]+)/)
  return m ? m[2] : null
}

// ─── SessionListScreen (/') ──────────────────────────────────────────────────

test('session list: key elements visible on mobile', async ({ browser }) => {
  const page = await mobilePage(browser)
  try {
    await page.goto('/')

    // Logo and subtitle
    await expect(page.getByText('Monopoly').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Helsinki Edition').first()).toBeVisible({ timeout: 3000 })

    // Primary navigation buttons
    await expect(page.getByRole('button', { name: '+ Uusi peli' })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /⚡ 1 vs 1/ })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /⚡ 1 vs 2/ })).toBeVisible({ timeout: 2000 })

    // Refresh button always present once page loaded
    await expect(page.getByRole('button', { name: 'Päivitä lista' })).toBeVisible({ timeout: 8000 })
  } finally {
    await page.context().close()
  }
})

test('session list: quick start 1 vs 1 creates game and navigates', async ({ browser }) => {
  const page = await mobilePage(browser)
  let sid: string | null = null
  try {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /⚡ 1 vs 1/ })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /⚡ 1 vs 1/ }).click()

    // Redirected to game screen
    await expect(page).toHaveURL(/\/#\/game\//, { timeout: 15000 })
    sid = sidFromUrl(page.url())

    // Game screen loaded: human player's first turn → roll button visible
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 30000 })
  } finally {
    if (sid) await deleteSession(sid)
    await page.context().close()
  }
})

// ─── LobbyScreen (/lobby) ───────────────────────────────────────────────────

test('lobby: navigates from session list and shows correct elements', async ({ browser }) => {
  const page = await mobilePage(browser)
  try {
    await page.goto('/')
    await expect(page.getByRole('button', { name: '+ Uusi peli' })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: '+ Uusi peli' }).click()

    await expect(page).toHaveURL(/\/#\/lobby/, { timeout: 5000 })

    // Playing/spectating toggle
    await expect(page.getByRole('button', { name: 'Pelaan itse' })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'En pelaa itse' })).toBeVisible({ timeout: 2000 })

    // Name input pre-filled
    await expect(page.locator('input[type=text]').first()).toBeVisible({ timeout: 2000 })

    // Bot count section
    await expect(page.getByText(/Tietokonepelaajia: 0/)).toBeVisible({ timeout: 2000 })

    // Action buttons
    await expect(page.getByRole('button', { name: 'Luo odotushuone' })).toBeVisible({ timeout: 2000 })
    await expect(page.getByRole('button', { name: 'Aloita heti' })).toBeVisible({ timeout: 2000 })
  } finally {
    await page.context().close()
  }
})

test('lobby: bot count +/- buttons change the counter', async ({ browser }) => {
  const page = await mobilePage(browser)
  try {
    await page.goto('/#/lobby')

    await expect(page.getByText(/Tietokonepelaajia: 0/)).toBeVisible({ timeout: 5000 })

    // Add two bots
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByText(/Tietokonepelaajia: 1/)).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByText(/Tietokonepelaajia: 2/)).toBeVisible({ timeout: 2000 })

    // Remove one bot
    await page.getByRole('button', { name: '−' }).click()
    await expect(page.getByText(/Tietokonepelaajia: 1/)).toBeVisible({ timeout: 2000 })
  } finally {
    await page.context().close()
  }
})

test('lobby: "Aloita heti" disabled without bots, enabled after adding one', async ({ browser }) => {
  const page = await mobilePage(browser)
  try {
    await page.goto('/#/lobby')
    await expect(page.getByText(/Tietokonepelaajia: 0/)).toBeVisible({ timeout: 5000 })

    // Disabled when botCount=0 (canStartNow = name && botCount >= 1)
    await expect(page.getByRole('button', { name: 'Aloita heti' })).toBeDisabled({ timeout: 3000 })

    // Add 1 bot → enabled
    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByRole('button', { name: 'Aloita heti' })).toBeEnabled({ timeout: 3000 })
  } finally {
    await page.context().close()
  }
})

test('lobby: "Aloita heti" with 1 bot starts game immediately', async ({ browser }) => {
  const page = await mobilePage(browser)
  let sid: string | null = null
  try {
    await page.goto('/#/lobby')
    await expect(page.getByText(/Tietokonepelaajia: 0/)).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: '+' }).click()
    await expect(page.getByRole('button', { name: 'Aloita heti' })).toBeEnabled({ timeout: 3000 })
    await page.getByRole('button', { name: 'Aloita heti' }).click()

    // Backend creates lobby + bot + starts → navigates to game
    await expect(page).toHaveURL(/\/#\/game\//, { timeout: 15000 })
    sid = sidFromUrl(page.url())
  } finally {
    if (sid) await deleteSession(sid)
    await page.context().close()
  }
})

test('lobby: "Takaisin" returns to session list', async ({ browser }) => {
  const page = await mobilePage(browser)
  try {
    await page.goto('/#/lobby')
    await expect(page.getByRole('button', { name: 'Takaisin' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Takaisin' }).click()

    await expect(page).toHaveURL(/\/#\/$|\/\s*$/, { timeout: 5000 })
    await expect(page.getByRole('button', { name: '+ Uusi peli' })).toBeVisible({ timeout: 5000 })
  } finally {
    await page.context().close()
  }
})

// ─── LobbyWaitingScreen (/lobby-wait/:id) ───────────────────────────────────

test('waiting room: shows PIN and ready button after creating lobby', async ({ browser }) => {
  const page = await mobilePage(browser)
  let sid: string | null = null
  try {
    await page.goto('/#/lobby')
    await expect(page.getByRole('button', { name: 'Luo odotushuone' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Luo odotushuone' }).click()

    // Navigated to waiting room
    await expect(page).toHaveURL(/\/#\/lobby-wait\//, { timeout: 15000 })
    sid = sidFromUrl(page.url())

    // Game PIN visible
    await expect(page.getByText('Pelin koodi:').first()).toBeVisible({ timeout: 5000 })

    // Host sees ready button (SSE fires with seat data)
    await expect(page.getByRole('button', { name: 'Olen valmis' })).toBeVisible({ timeout: 8000 })

    // Add bot button visible for host
    await expect(page.getByRole('button', { name: /Lisää botti/ })).toBeVisible({ timeout: 3000 })
  } finally {
    if (sid) await deleteSession(sid)
    await page.context().close()
  }
})

test('waiting room: mark ready toggles to cancel-ready', async ({ browser }) => {
  const page = await mobilePage(browser)
  let sid: string | null = null
  try {
    await page.goto('/#/lobby')
    await expect(page.getByRole('button', { name: 'Luo odotushuone' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Luo odotushuone' }).click()

    await expect(page).toHaveURL(/\/#\/lobby-wait\//, { timeout: 15000 })
    sid = sidFromUrl(page.url())

    await expect(page.getByRole('button', { name: 'Olen valmis' })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: 'Olen valmis' }).click()

    // After marking ready: button changes to "Peru valmius"
    await expect(page.getByRole('button', { name: 'Peru valmius' })).toBeVisible({ timeout: 5000 })
  } finally {
    if (sid) await deleteSession(sid)
    await page.context().close()
  }
})

test('waiting room: add bot adds a bot seat to the list', async ({ browser }) => {
  const page = await mobilePage(browser)
  let sid: string | null = null
  try {
    await page.goto('/#/lobby')
    await expect(page.getByRole('button', { name: 'Luo odotushuone' })).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: 'Luo odotushuone' }).click()

    await expect(page).toHaveURL(/\/#\/lobby-wait\//, { timeout: 15000 })
    sid = sidFromUrl(page.url())

    await expect(page.getByRole('button', { name: /Lisää botti/ })).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /Lisää botti/ }).click()

    // Bot seat appears in the seat list (🤖 prefix)
    await expect(page.getByText(/🤖/).first()).toBeVisible({ timeout: 5000 })
  } finally {
    if (sid) await deleteSession(sid)
    await page.context().close()
  }
})
