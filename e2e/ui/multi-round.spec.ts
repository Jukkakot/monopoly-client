import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import { createHumanBotSession, getSnapshot, injectState, setBotSpeed, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateAsHuman(page: Page, sid: string, humanPlayerId: string, humanPlayerToken: string) {
  await page.goto('/')
  await page.evaluate(({ sid, playerId, token }) => {
    localStorage.setItem('animation-speed', 'fast')  // prevent long animations in CI
    sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, playerId: humanPlayerId, token: humanPlayerToken })
  await page.goto(`/#/game/${sid}`)
}

function humanSeatOf(snap: ClientSessionSnapshot, humanPlayerId: string): number {
  const idx = snap.state!.players.findIndex(p => p.playerId === humanPlayerId)
  if (idx === -1) throw new Error(`humanSeatOf: ${humanPlayerId} not found`)
  return idx
}

test('end turn → bot acts → human can roll again', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Human WAITING_FOR_END_TURN at FREE_PARKING; bot is in jail (quick turn: roll, stay in jail, end turn)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 20 }, { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }]
        : [{ cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }, { cash: 1500, boardIndex: 20 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-end-turn').first().click()

    // End-turn disappears; bot takes its (jail) turn; roll button reappears for human
    await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('two consecutive turns: roll twice, end-turn appears after each', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Bot in jail so its turns are fast (roll, stay in jail, end turn).
    // Human owns B2 — short 3-spot move minimises animation delay.
    const scenario = {
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }]
        : [{ cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2] as [number, number],  // sum=3 → 0+3=3 = B2 (own) → WAITING_FOR_END_TURN
      expectedAfter: {},
    }

    await injectState(sid, buildPatch(scenario, snap0))
    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // Turn 1: roll (→ B2, own property) → end-turn
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 8000 })
    await page.getByTestId('action-end-turn').first().click()

    // Bot takes jail turn; wait for human's roll button to reappear
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 10000 })

    // Re-inject to reset position + forced dice for the second roll.
    // Re-injection changes boardIndex (B2→0) which triggers a token animation;
    // action-roll may be absent while ActionPanel waits for the animation to finish.
    await injectState(sid, buildPatch(scenario, snap0))

    // Turn 2: roll again (→ B2, own) → end-turn visible
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 10000 })
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})
