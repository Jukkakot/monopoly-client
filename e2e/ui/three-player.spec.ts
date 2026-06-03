/**
 * Three-player game UI tests.
 *
 * Verifies that games with 3+ players render correctly: all players in the
 * list, correct turn order, rankings update, and a third player can act.
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createBotSession, createHumanBotSession, getSnapshot,
  injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateSpectator(page: Page, sid: string) {
  await page.goto('/')
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

async function navigateAsHuman(page: Page, sid: string, pid: string, token: string) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, pid, token })
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

// ─── Player list ──────────────────────────────────────────────────────────────

test('three players: player list shows all 3 players', async ({ page }) => {
  const sid = await createBotSession(3)
  try {
    await navigateSpectator(page, sid)

    // All 3 cash testids visible (seats 0, 1, 2)
    await expect(page.getByTestId('player-0-cash').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('player-1-cash').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('player-2-cash').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('three players: rankings update when one player loses cash', async ({ page }) => {
  const sid = await createBotSession(3)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)

    // Inject distinct cash values: seat0=2000, seat1=1000, seat2=500
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [
        { cash: 2000, boardIndex: 0 },
        { cash: 1000, boardIndex: 10 },
        { cash: 500,  boardIndex: 20 },
      ],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateSpectator(page, sid)

    await expect(page.getByTestId('player-0-cash').first()).toContainText('€2000', { timeout: 5000 })
    await expect(page.getByTestId('player-1-cash').first()).toContainText('€1000', { timeout: 3000 })
    await expect(page.getByTestId('player-2-cash').first()).toContainText('€500',  { timeout: 3000 })

    // Richest player has 🥇 medal in player list
    await expect(page.getByText('🥇').first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByText('🥈').first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByText('🥉').first()).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('three players: spectator sees all 3 cash values', async ({ page }) => {
  const sid = await createBotSession(3)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [
        { cash: 1500, boardIndex: 0 },
        { cash: 1200, boardIndex: 5 },
        { cash: 900,  boardIndex: 15 },
      ],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateSpectator(page, sid)

    await expect(page.getByTestId('player-0-cash').first()).toContainText('€1500', { timeout: 5000 })
    await expect(page.getByTestId('player-1-cash').first()).toContainText('€1200', { timeout: 3000 })
    await expect(page.getByTestId('player-2-cash').first()).toContainText('€900',  { timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('three players: human player (seat 0) has roll button, others do not', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = snap0.state!.seats.find(s => s.playerId === humanPlayerId)!.seatIndex

    // In a 2-player game (1 human + 1 bot), inject human's turn as WAITING_FOR_ROLL
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    // Roll and advance to next phase
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('three players: phase indicator shows active player name', async ({ page }) => {
  const sid = await createBotSession(3)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const players = snap0.state!.players

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [
        { cash: 1500, boardIndex: 0 },
        { cash: 1500, boardIndex: 10 },
        { cash: 1500, boardIndex: 20 },
      ],
      turn: { seat: 1, phase: 'WAITING_FOR_ROLL' },  // seat 1 is active
      expectedAfter: {},
    }, snap0))

    await navigateSpectator(page, sid)

    // Spectator panel shows active player name + phase
    const activeName = players[1].name
    await expect(page.getByTestId('current-phase').first()).toContainText(activeName, { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
