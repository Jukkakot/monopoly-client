import { test, expect } from '@playwright/test'
import { createBotSession, getSnapshot, injectState, setBotSpeed, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

test('spectator: all player cash values visible (3-player game)', async ({ page }) => {
  const sid = await createBotSession(3)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [
        { cash: 111, boardIndex: 0 },
        { cash: 222, boardIndex: 10 },
        { cash: 333, boardIndex: 20 },
      ],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    // All 3 injected cash values arrive via SSE and render in the player list
    await expect(page.getByTestId('player-0-cash').first()).toContainText('111', { timeout: 8000 })
    await expect(page.getByTestId('player-1-cash').first()).toContainText('222', { timeout: 5000 })
    await expect(page.getByTestId('player-2-cash').first()).toContainText('333', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('spectator: active phase indicator shows current player and phase', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [
        { cash: 1500, boardIndex: 0 },
        { cash: 1500, boardIndex: 10 },
      ],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    // Spectator panel shows active player name + phase in current-phase element
    await expect(page.getByTestId('current-phase').first()).toBeVisible({ timeout: 8000 })
    const text = await page.getByTestId('current-phase').first().textContent()
    expect(text).toBeTruthy()
    expect(text!.length).toBeGreaterThan(0)
  } finally {
    await deleteSession(sid)
  }
})

test('spectator: action buttons not visible', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    // Spectator has no credentials → no action buttons rendered
    await expect(page.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})
