import { test, expect } from '@playwright/test'
import { createBotSession, getSnapshot, injectState, setBotSpeed, sendCmd, deleteSession } from '../helpers/api'
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
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    const snap0 = await getSnapshot(sid)
    const ids = snap0.state!.players.map(p => p.playerId)

    // Inject: seat0 has €1, seat1 owns B2 with hotel (rent €450) → seat0 can't pay → bankrupt
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
      ownedProperties: { 1: ['B1', 'B2'] },
      propertyOverrides: { B2: { hotelCount: 1 } },
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    // Trigger bankruptcy via API
    await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
    const snap1 = await getSnapshot(sid)
    await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: ids[0], debtId: snap1.state!.activeDebt!.debtId })

    // Wait for frontend to receive GAME_OVER state via SSE
    await expect(page.getByTestId('game-status')).toHaveAttribute('data-status', 'GAME_OVER', { timeout: 10000 })
    // Overlay should now be visible
    await expect(page.getByTestId('game-over-winner')).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})
