import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import { createHumanBotSession, getSnapshot, injectState, setBotSpeed, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateAsHuman(page: Page, sid: string, humanPlayerId: string, humanPlayerToken: string) {
  await page.goto('/')
  await page.evaluate(({ sid, playerId, token }) => {
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

test('decline purchase → auction starts, pass button visible', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at GO, dice [1,2]=3 → B2 (unowned) → decision
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-decline').first().click()

    // Auction started → pass button visible
    await expect(page.getByTestId('action-pass-auction').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('pass auction → auction panel closes for this player', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-decline').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-decline').first().click()
    await expect(page.getByTestId('action-pass-auction').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-pass-auction').first().click()

    // After passing: pass button gone (now waiting for bot to bid or pass)
    await expect(page.getByTestId('action-pass-auction').first()).not.toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
