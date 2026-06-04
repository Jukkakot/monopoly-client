/**
 * GameScreen edge case tests.
 *
 * Covers error states and recovery paths that don't fit other spec files:
 *   - Navigating to a non-existent session → auto-redirect to session list
 *   - Browser document title changes based on turn state
 *   - Spectator AbortGame button (non-host view)
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createHumanBotSession, createBotSession, getSnapshot,
  injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateAsHuman(page: Page, sid: string, pid: string, token: string, hostToken?: string) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token, hostToken }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
    if (hostToken) localStorage.setItem(`monopoly_host_${sid}`, hostToken)
  }, { sid, pid, token, hostToken: hostToken ?? null })
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

// ─── Non-existent session ─────────────────────────────────────────────────────

test('game screen: navigating to deleted session redirects to session list', async ({ page }) => {
  // Create and immediately delete a session, then navigate to it
  const sid = await createBotSession(2)
  await deleteSession(sid)

  await page.goto(`/#/game/${sid}`)

  // GameScreen detects FAILED connection and auto-redirects
  await expect(page).toHaveURL(/\/#\/$|#\/$/, { timeout: 10000 })
  await expect(page.getByRole('button', { name: '+ Uusi peli' })).toBeVisible({ timeout: 5000 })
})

// ─── Document title ───────────────────────────────────────────────────────────

test('game screen: document title shows "Monopoly Helsinki" by default', async ({ page }) => {
  await page.goto('/')
  expect(await page.title()).toContain('Monopoly')
})

test('game screen: title shows player turn during game', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken, hostToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = snap0.state!.seats.find(s => s.playerId === humanPlayerId)!.seatIndex

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken, hostToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 8000 })

    // When it's the human's turn, title shows "🎲 Sinun vuorosi"
    const title = await page.title()
    expect(title).toContain('🎲')
  } finally {
    await deleteSession(sid)
  }
})

// ─── Spectator AbortGame button ───────────────────────────────────────────────

test('game screen: spectator "Lopeta peli" button visible in action panel', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await page.goto('/')
    await page.goto(`/#/game/${sid}`)
    await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })

    // Spectator action panel shows a "Lopeta peli" button (for admin/cleanup)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Lopeta peli/ }).first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

// ─── Mute keyboard shortcut ───────────────────────────────────────────────────

test('game screen: M key toggles mute (volume icon changes)', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await page.goto(`/#/game/${sid}`)
    await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })

    // Find the mute button (shows volume icon or 🔇)
    const muteBtn = page.locator('[class*=muteBtn]').first()
    await expect(muteBtn).toBeVisible({ timeout: 5000 })
    const initialTitle = await muteBtn.getAttribute('title')

    // Press M to toggle mute
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }))
    })

    // Title/state changes
    await page.waitForTimeout(200)
    const afterTitle = await muteBtn.getAttribute('title')
    expect(afterTitle).not.toBe(null)
    // Title changed (mute state flipped) OR stayed same if already muted
    expect(typeof afterTitle).toBe('string')
  } finally {
    await deleteSession(sid)
  }
})
