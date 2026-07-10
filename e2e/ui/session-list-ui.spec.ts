/**
 * SessionListScreen UI interaction tests.
 *
 * Covers the right-column session list (active/lobby/finished games) and the
 * UI actions available on each row: copy ID, join, delete, rejoin banner.
 */
import { test, expect } from '@playwright/test'
import { createBotSession, deleteSession } from '../helpers/api'
import { recordSession } from '../helpers/sessionTracker'

// ─── Session rows ─────────────────────────────────────────────────────────────

test('session list: active game row shows player names', async ({ page }) => {
  // createBotSession creates a 2-player game that is IN_PROGRESS
  const sid = await createBotSession(2)
  try {
    await page.goto('/')
    // Wait for session list to load and show the session
    await expect(page.locator('[class*=sessionRow]').filter({ hasText: sid }).first()).toBeVisible({ timeout: 15000 })

    // Session row should contain player names (A and B from createBotSession)
    const row = page.locator('[class*=sessionRow]').filter({ hasText: sid })
    await expect(row).toBeVisible({ timeout: 3000 })
    await expect(row.getByText(/A.*B|B.*A/)).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('session list: copy button changes to ✓ after clicking', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await page.goto('/')
    await expect(page.locator('[class*=sessionRow]').filter({ hasText: sid }).first()).toBeVisible({ timeout: 15000 })

    const row = page.locator('[class*=sessionRow]').filter({ hasText: sid })
    const copyBtn = row.locator('[class*=copyBtn]')
    await expect(copyBtn).toBeVisible({ timeout: 3000 })
    await expect(copyBtn).toContainText('⎘')

    // Grant clipboard permission so navigator.clipboard.writeText succeeds
    await page.context().grantPermissions(['clipboard-write'])
    await copyBtn.click()
    // Briefly shows ✓ after click
    await expect(copyBtn).toContainText('✓', { timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('session list: join button navigates to game screen', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await page.goto('/')
    await expect(page.locator('[class*=sessionRow]').filter({ hasText: sid }).first()).toBeVisible({ timeout: 15000 })

    const row = page.locator('[class*=sessionRow]').filter({ hasText: sid })
    await row.getByRole('button', { name: 'Liity' }).click()

    await expect(page).toHaveURL(new RegExp(sid), { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('session list: lobby row shows "Liity odotushuoneeseen" button', async ({ page }) => {
  // createHumanBotSession creates and starts a game; we need a pure lobby.
  // POST /sessions with lobbyMode=true creates a LOBBY session.
  const BASE = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'
  const r = await fetch(`${BASE}/sessions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyMode: true, hostName: 'HostTest', hostColor: '#e53935' }),
  })
  const { sessionId: sid } = await r.json()
  recordSession(sid)
  try {
    await page.goto('/')
    await expect(page.locator('[class*=sessionRow]').filter({ hasText: sid }).first()).toBeVisible({ timeout: 15000 })

    const row = page.locator('[class*=sessionRow]').filter({ hasText: sid })
    await expect(row.getByRole('button', { name: 'Liity odotushuoneeseen' })).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

// ─── Rejoin banner ─────────────────────────────────────────────────────────────

test('session list: rejoin banner shows when last session exists in localStorage', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await page.goto('/')
    // Set last session in localStorage before the page initialises its state
    await page.evaluate((sessionId) => {
      localStorage.setItem('monopoly_last_session', sessionId)
    }, sid)
    await page.reload()

    // Rejoin banner: shows the session ID and a "Liity" button
    await expect(page.locator('[class*=rejoinBanner]')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(sid).first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('session list: rejoin banner can be dismissed', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await page.goto('/')
    await page.evaluate((s) => localStorage.setItem('monopoly_last_session', s), sid)
    await page.reload()

    await expect(page.locator('[class*=rejoinBanner]')).toBeVisible({ timeout: 8000 })

    // Dismiss (✕ button)
    await page.locator('[class*=rejoinDismiss]').click()
    await expect(page.locator('[class*=rejoinBanner]')).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})
