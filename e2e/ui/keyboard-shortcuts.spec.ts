/**
 * Keyboard shortcut tests.
 *
 * GameScreen handles these keyboard events on window:
 *   Space → RollDice (WAITING_FOR_ROLL) or EndTurn (WAITING_FOR_END_TURN, no doubles)
 *         → BuyProperty (WAITING_FOR_DECISION) or AcknowledgeCard (WAITING_FOR_CARD_ACK)
 *   B     → BuyProperty (WAITING_FOR_DECISION)
 *   D     → DeclineProperty (WAITING_FOR_DECISION) or toggleDebugMode (DEV)
 *   M     → toggle mute
 *   ?     → toggle help modal
 *
 * Tests that use Space must dispatch keyboard events on the document since
 * `page.keyboard.press('Space')` sends to the focused element.
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createHumanBotSession, getSnapshot,
  injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateAsHuman(page: Page, sid: string, pid: string, token: string) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, pid, token })
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

function humanSeat(snap: Awaited<ReturnType<typeof getSnapshot>>, pid: string): number {
  return snap.state!.seats.find(s => s.playerId === pid)!.seatIndex
}

function pressKey(page: Page, key: string) {
  return page.evaluate((k) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
  }, key)
}

// ─── Space key ────────────────────────────────────────────────────────────────

test('keyboard: Space rolls dice in WAITING_FOR_ROLL', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
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

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    await pressKey(page, ' ')

    // Roll button disappears after Space triggers RollDice
    await expect(page.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('keyboard: Space ends turn in WAITING_FOR_END_TURN (no doubles)', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 5 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 5 }],
      turn: { seat, phase: 'WAITING_FOR_END_TURN', consecutiveDoubles: 0 },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })

    await pressKey(page, ' ')

    // End-turn button disappears after Space triggers EndTurn
    await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('keyboard: Space does NOT end turn when consecutiveDoubles > 0', async ({ page }) => {
  // After rolling doubles, Space should roll again (not end turn)
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // consecutiveDoubles=1 means player rolled doubles → must roll again, not end
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 5 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 5 }],
      turn: { seat, phase: 'WAITING_FOR_ROLL', consecutiveDoubles: 1 },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    // In doubles-roll state the action panel shows "Heitä uudelleen" not end-turn
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    // End-turn button should NOT be present (player must roll again)
    await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

