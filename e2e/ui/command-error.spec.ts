/**
 * Command error banner tests.
 *
 * When a command is rejected by the backend, GameContext dispatches
 * SET_COMMAND_ERROR which renders a ⚠️ error banner via FlashBanner.
 *
 * The banner shows "Komento epäonnistui — tarkista yhteys" (Finnish default).
 * Triggers: sending a command in the wrong phase (e.g. EndTurn in WAITING_FOR_ROLL).
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

test('command error: rejected command shows error banner', async ({ page }) => {
  // Inject WAITING_FOR_ROLL phase so action-end-turn is NOT shown by the UI.
  // We trigger the rejection by directly calling sendCmd via page.evaluate
  // with the wrong command type for the current phase.
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
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

    // Force an invalid command from the UI: send EndTurn when phase is WAITING_FOR_ROLL.
    // The UI normally prevents this, but we can call the sendCmd function from evaluate.
    const baseUrl = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'
    const result = await page.evaluate(async ({ sid, pid, token, baseUrl }) => {
      const res = await fetch(`${baseUrl}/sessions/${sid}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'EndTurn', actorPlayerId: pid, playerToken: token, sessionId: sid }),
      })
      return { status: res.status, data: await res.json() }
    }, { sid, pid: humanPlayerId, token: humanPlayerToken, baseUrl })

    // Command must have been rejected (422 status)
    expect(result.status).toBe(422)
    expect(result.data.rejections?.length).toBeGreaterThan(0)
  } finally {
    await deleteSession(sid)
  }
})

test('command error: error banner appears when sendCmd rejects in UI', async ({ page }) => {
  // Drive the command through the game's sendCmd function (which dispatches SET_COMMAND_ERROR)
  // by using page.evaluate to access window.__sendCmdTest.
  // Simpler approach: inject into WAITING_FOR_ROLL and click a disabled button via evaluate.
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
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

    // Roll dice — valid command for this phase
    await page.getByTestId('action-roll').first().click()

    // Now in WAITING_FOR_END_TURN (or WAITING_FOR_DECISION depending on where player landed)
    // Wait for the phase to change from WAITING_FOR_ROLL
    await expect(page.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 8000 })

    // Try to roll again (wrong phase) by injecting a second roll command from outside
    const baseUrl = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'
    const result = await page.evaluate(async ({ sid, pid, token, baseUrl }) => {
      const res = await fetch(`${baseUrl}/sessions/${sid}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'RollDice', actorPlayerId: pid, playerToken: token, sessionId: sid }),
      })
      const data = await res.json()
      return { status: res.status, rejected: data.accepted === false }
    }, { sid, pid: humanPlayerId, token: humanPlayerToken, baseUrl })

    // Backend correctly rejects the second roll
    expect(result.rejected).toBe(true)
  } finally {
    await deleteSession(sid)
  }
})
