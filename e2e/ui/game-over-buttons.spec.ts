/**
 * GameOverOverlay navigation button tests.
 * The overlay shows two buttons once a game ends:
 *   - "Jatka katselemaan" → dismisses the overlay (stays on game screen)
 *   - "Takaisin etusivulle" → navigates to the session list
 *
 * The game-over winner overlay appearance is already covered in action-panel.spec.ts,
 * bankruptcy.spec.ts and mobile-advanced.spec.ts. These tests focus on what happens
 * after the user interacts with the buttons.
 */
import { test, expect } from '@playwright/test'
import { createBotSession, injectState, getSnapshot, setBotSpeed, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function reachGameOver(page: import('@playwright/test').Page, sid: string) {
  const snap0 = await getSnapshot(sid)

  // seat0 has €1, seat1 owns B1+B2 with hotel → seat0 lands on B2 → unaffordable rent → bankrupt.
  // Both players are bots so they handle RollDice and DeclareBankruptcy automatically.
  await injectState(sid, buildPatch({
    description: '', rules: [],
    players: [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
    ownedProperties: { 1: ['B1', 'B2'] },
    propertyOverrides: { B2: { hotelCount: 1 } },
    turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
    forcedDice: [1, 2],  // lands on B2 (index 3)
    expectedAfter: {},
  }, snap0))

  // Bots drive everything: seat0 rolls, can't pay rent, declares bankruptcy → GAME_OVER.
  await expect(page.getByTestId('game-status').first()).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 15000 })
  await expect(page.getByTestId('game-over-winner').first()).toBeVisible({ timeout: 3000 })
}

test('game over: "Jatka katselemaan" dismisses overlay and stays on game screen', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    await reachGameOver(page, sid)

    await page.getByRole('button', { name: 'Jatka katselemaan' }).click()

    // Overlay dismissed — game screen remains, winner testid gone
    await expect(page.getByTestId('game-over-winner')).not.toBeVisible({ timeout: 3000 })
    // Still on the game screen (URL still has /game/)
    await expect(page).toHaveURL(/\/#\/game\//)
  } finally {
    await deleteSession(sid)
  }
})

test('game over: "Takaisin etusivulle" navigates to session list', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    await reachGameOver(page, sid)

    await page.getByRole('button', { name: 'Takaisin etusivulle' }).click()

    // Navigated to session list
    await expect(page).toHaveURL(/\/#\/$|#\/$/, { timeout: 5000 })
    await expect(page.getByRole('button', { name: '+ Uusi peli' })).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('game over: rankings list shows all players', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    await reachGameOver(page, sid)

    // Both players should appear in the rankings (🥇 and 🥈 medals)
    await expect(page.getByText('🥇').first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByText('🥈').first()).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})
