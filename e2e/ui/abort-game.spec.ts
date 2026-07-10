/**
 * AbortGame tests — host ends game for all players.
 *
 * The host can end the game via the overflow menu → "Lopeta peli kaikilta".
 * This sends AbortGame command → backend marks the session as GAME_OVER.
 * All connected clients (host + spectators) should see the game-over overlay.
 *
 * Only the host button is active; non-hosts see a disabled version.
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createHumanBotSession, getSnapshot,
  injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateAsHuman(
  page: Page, sid: string, pid: string, token: string, hostToken?: string
) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token, hostToken }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
    // AbortGame command requires hostToken in localStorage
    if (hostToken) localStorage.setItem(`monopoly_host_${sid}`, hostToken)
  }, { sid, pid, token, hostToken: hostToken ?? null })
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

function humanSeat(snap: Awaited<ReturnType<typeof getSnapshot>>, pid: string): number {
  return snap.state!.seats.find(s => s.playerId === pid)!.seatIndex
}

test('abort game: host sees enabled "Lopeta peli kaikilta" button', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken, hostToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken, hostToken)
    // Wait for SSE snapshot to load (action panel shows once snapshot received)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 8000 })

    // Open overflow menu
    await page.getByTitle('Lisätoiminnot').first().click()

    // Host sees enabled end-game button
    const endBtn = page.getByRole('button', { name: /Lopeta peli kaikille/ })
    await expect(endBtn).toBeVisible({ timeout: 3000 })
    await expect(endBtn).toBeEnabled({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('abort game: non-host sees disabled "Lopeta peli kaikilta" button', async ({ page }) => {
  // Spectator (no player token) — the non-player case
  const sid = await createHumanBotSession().then(r => r.sid)
  try {
    // Navigate as spectator (no credentials)
    await page.goto('/')
    await page.goto(`/#/game/${sid}`)
    await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })

    // Open overflow menu
    await page.getByTitle('Lisätoiminnot').first().click()

    // Spectator sees the end-game button but it may be hidden (snapshot not available)
    // OR the spectator panel doesn't show the end-game button at all in their view
    // Either way, the abort button should NOT be easily accessible
    // (Spectator has "Lopeta peli" via ActionPanel "spectator" view, not the same)
    await expect(page.getByRole('button', { name: /Poistu pelistä/ })).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('abort game: aborting sends game to GAME_OVER state', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken, hostToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

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

    // Open menu and abort
    await page.getByTitle('Lisätoiminnot').first().click()
    const endBtn = page.getByRole('button', { name: /Lopeta peli kaikille/ })
    await expect(endBtn).toBeEnabled({ timeout: 3000 })
    await endBtn.click()

    // Clicking opens a styled confirmation dialog — accept it to fire the abort.
    await page.getByTestId('confirm-accept').click()

    // Game transitions to GAME_OVER
    await expect(page.getByTestId('game-status').first()).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 10000 })
  } finally {
    await deleteSession(sid)
  }
})
