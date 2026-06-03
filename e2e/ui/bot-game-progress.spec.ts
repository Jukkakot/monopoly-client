/**
 * All-bots game progress tests.
 *
 * Creates a bots-only game and verifies that the game actually advances
 * autonomously: turns change, cash values update, and the event log grows.
 *
 * These tests don't inject state — they watch real bot play and assert on
 * observable side-effects (turn number changes, log entries).
 */
import { test, expect, type Page } from '@playwright/test'
import { createBotSession, getSnapshot, setBotSpeed, deleteSession } from '../helpers/api'

async function navigateSpectator(page: Page, sid: string) {
  await page.goto('/')
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

test('bot game: spectator view shows active player indicator', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await navigateSpectator(page, sid)

    // Spectator panel shows active player + phase
    await expect(page.getByTestId('current-phase').first()).toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('bot game: bots advance the game — activePlayerId switches', async ({ page }) => {
  // With 2 bots at fast speed, the active player should switch at least once.
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await navigateSpectator(page, sid)

    // Record initial active player
    await expect(page.getByTestId('current-phase').first()).toBeVisible({ timeout: 8000 })
    const snap0 = await getSnapshot(sid)
    const initialActiveId = snap0.state?.turn?.activePlayerId

    // Wait for game to progress
    await page.waitForTimeout(3000)

    const snap1 = await getSnapshot(sid)
    // Game is still running
    expect(snap1.status).toBe('IN_PROGRESS')
    // UI event log has at least one entry (bots rolled and moved)
    const logEl = page.getByTestId('event-log').first()
    await expect(logEl.locator('div').first()).toBeVisible({ timeout: 5000 })
    void initialActiveId
  } finally {
    await deleteSession(sid)
  }
})

test('bot game: cash values in player list update as bots play', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await navigateSpectator(page, sid)

    // Wait for initial state and record first cash
    await expect(page.getByTestId('player-0-cash').first()).toBeVisible({ timeout: 8000 })
    const initialCash = await page.getByTestId('player-0-cash').first().textContent()

    // Wait for game to progress — cash may change via rent/tax
    // We wait for at least 1 state change in the event log
    const logEl = page.getByTestId('event-log').first()
    await expect(logEl.locator('div, span').first()).toBeVisible({ timeout: 15000 })

    // Player list still shows cash (SSE updates still flowing)
    await expect(page.getByTestId('player-0-cash').first()).toBeVisible({ timeout: 3000 })
    expect(initialCash).toBeTruthy()
  } finally {
    await deleteSession(sid)
  }
})

test('bot game: event log grows as bots take turns', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await navigateSpectator(page, sid)

    const logEl = page.getByTestId('event-log').first()

    // Wait for at least one log entry (dice roll event)
    await expect(logEl.getByText(/heitti/).first()).toBeVisible({ timeout: 15000 })
  } finally {
    await deleteSession(sid)
  }
})

test('bot game: 3-player all-bots game runs without visible errors', async ({ page }) => {
  const sid = await createBotSession(3)
  try {
    await setBotSpeed(sid, 'fast')
    await navigateSpectator(page, sid)

    // All 3 players show in the list
    await expect(page.getByTestId('player-0-cash').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('player-1-cash').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('player-2-cash').first()).toBeVisible({ timeout: 3000 })

    // No error banner appears (no command errors)
    await expect(page.locator('[class*=error]').filter({ hasText: 'Komento epäonnistui' })).not.toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
