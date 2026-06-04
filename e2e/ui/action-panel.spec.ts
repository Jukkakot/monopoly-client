import { test, expect } from '@playwright/test'
import { createBotSession, createHumanBotSession, getSnapshot, injectState, setBotSpeed, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

// All tests follow the same pattern:
//   1. Navigate first → frontend subscribes to SSE for this session
//   2. Inject state → backend fires SSE → frontend re-renders
//   3. Assert DOM via Playwright (waits up to timeout for SSE to deliver)

test('spectator sees active player and phase in action panel', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')  // bots wait before acting — won't interfere
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    const snap0 = await getSnapshot(sid)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    // Spectator sees "⏳ A — Heitä nopat" (or similar Finnish phase name)
    await expect(page.getByTestId('current-phase').first()).toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('player cash values update in the player list', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    const snap0 = await getSnapshot(sid)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [
        { cash: 777, boardIndex: 0  },
        { cash: 333, boardIndex: 10 },
      ],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    // Injected cash values should appear in the player list
    await expect(page.getByTestId('player-0-cash').first()).toContainText('777', { timeout: 8000 })
    await expect(page.getByTestId('player-1-cash').first()).toContainText('333', { timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('game over overlay appears with winner name after bankruptcy', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = snap0.state!.players.findIndex(p => p.playerId === humanPlayerId)
    const botSeat = 1 - humanSeat

    // Human (humanSeat) has €1; bot (botSeat) owns B2 with hotel (rent €450)
    // → human rolls [1,2]=3 → lands on B2 → can't pay → declare bankruptcy → GAME_OVER
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['B1', 'B2'] },
      propertyOverrides: { B2: { hotelCount: 1 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    // Navigate as the human player (fast animations to avoid waiting on token moves)
    await page.goto('/')
    await page.evaluate(({ sid, playerId, token }) => {
      localStorage.setItem('animation-speed', 'fast')
      sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
      sessionStorage.setItem(`monopoly_token_${sid}`, token)
    }, { sid, playerId: humanPlayerId, token: humanPlayerToken })
    await page.goto(`/#/game/${sid}`)

    // Human rolls → lands on B2 → enters debt (can't pay €450 with €1)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 8000 })
    await page.getByTestId('action-roll').first().click()

    // Declare bankruptcy via UI button
    await expect(page.getByTestId('action-declare-bankruptcy').first()).toBeVisible({ timeout: 8000 })
    await page.getByTestId('action-declare-bankruptcy').first().click()

    // Wait for frontend to receive GAME_OVER state via SSE
    await expect(page.getByTestId('game-status')).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 10000 })
    await expect(page.getByTestId('game-over-winner')).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})
