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
import { createBotSession, injectState, getSnapshot, setBotSpeed, deleteSession, retrigger, setViewerGating } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function reachGameOver(page: import('@playwright/test').Page, sid: string) {
  const snap0 = await getSnapshot(sid)

  // Disable viewer gating so bots act immediately without waiting for client ACKs.
  // Without this, the 50 ms ACK throttle can cause version lag > MAX_CLIENT_LAG_VERSIONS,
  // making the bot driver stall until the watchdog fires (every 5 s) — flaky at 15-20 s timeout.
  await setViewerGating(sid, false)

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

  // Two bot steps needed: (1) RollDice → RESOLVING_DEBT, (2) DeclareBankruptcy → GAME_OVER.
  // Keep nudging the bot until the BACKEND reports GAME_OVER — each retrigger resets
  // pendingAction and forces an immediate bot step (safe no-op once the game is over).
  // Polling the backend decouples "did the bots finish?" from UI rendering, which now
  // plays the final turn's animations before showing the overlay.
  let backendOver = false
  for (let i = 0; i < 30 && !backendOver; i++) {
    await retrigger(sid)
    await new Promise(r => setTimeout(r, 300))
    const snap = await getSnapshot(sid)
    backendOver = snap.status === 'GAME_OVER' || snap.state?.status === 'GAME_OVER'
  }
  expect(backendOver, 'backend should reach GAME_OVER within the retrigger budget').toBe(true)

  // UI catches up once the final animations drain
  await expect(page.getByTestId('game-status').first()).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 15000 })
  await expect(page.getByTestId('game-over-winner').first()).toBeVisible({ timeout: 3000 })
}

/** Open the game as a spectator with fast animations — a natural game over now flows
 *  through the animation queue, so slow animations would eat the assertion timeouts. */
async function gotoGameFastAnims(page: import('@playwright/test').Page, sid: string) {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('animation-speed', 'fast'))
  await page.goto(`/#/game/${sid}`)
}

test('game over: "Jatka katselemaan" dismisses overlay and stays on game screen', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await gotoGameFastAnims(page, sid)
    // Anchor on the always-present status span — the "Olet katsojana" text is hidden
    // whenever the bots happen to be mid-decision/trade/auction when we connect.
    await expect(page.getByTestId('game-status').first()).toBeAttached({ timeout: 8000 })

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
    await gotoGameFastAnims(page, sid)
    // Anchor on the always-present status span — the "Olet katsojana" text is hidden
    // whenever the bots happen to be mid-decision/trade/auction when we connect.
    await expect(page.getByTestId('game-status').first()).toBeAttached({ timeout: 8000 })

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
    await gotoGameFastAnims(page, sid)
    // Anchor on the always-present status span — the "Olet katsojana" text is hidden
    // whenever the bots happen to be mid-decision/trade/auction when we connect.
    await expect(page.getByTestId('game-status').first()).toBeAttached({ timeout: 8000 })

    await reachGameOver(page, sid)

    // Both players should appear in the rankings (🥇 and 🥈 medals)
    await expect(page.getByText('🥇').first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByText('🥈').first()).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})
