/**
 * No-errors chaos test: play through a full normal game flow as a human
 * and verify that window.__monopolyErrorLog stays empty throughout.
 *
 * Any entry in the log means the UI allowed a rejected backend command,
 * which represents a bug (button not disabled at the right time, etc.).
 */
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

async function getErrorLog(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__monopolyErrorLog ?? [])
}

async function assertNoErrors(page: Page, context: string) {
  const log = await getErrorLog(page)
  if (log.length > 0) {
    throw new Error(`${context}: unexpected errors in log:\n${log.join('\n')}`)
  }
}

test('normal play flow: roll → buy → end-turn produces no backend rejections', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at GO, no forced dice — will land on whatever comes up
    // Own B2 so we don't pay rent if we land there
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // lands on B2 (own) → WAITING_FOR_END_TURN directly
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await assertNoErrors(page, 'after navigate')

    // Roll
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await assertNoErrors(page, 'after roll')

    // End turn
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-end-turn').first().click()
    await assertNoErrors(page, 'after end-turn')
  } finally {
    await deleteSession(sid)
  }
})

test('buy property flow produces no backend rejections', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // → B2 (unowned) → WAITING_FOR_DECISION
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-buy').first().click()
    await assertNoErrors(page, 'after buy')
  } finally {
    await deleteSession(sid)
  }
})

test('jail flow: pay fine then roll produces no backend rejections', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 4],  // after paying fine: 10+7=17 = COMMUNITY2 (card) — risky, use safe spot
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-pay-jail-fine').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-pay-jail-fine').first().click()
    await assertNoErrors(page, 'after pay fine')

    // Roll with any dice (not forced, real bot session)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await assertNoErrors(page, 'after roll from jail')
  } finally {
    await deleteSession(sid)
  }
})

test('building flow: buy house then sell produces no backend rejections', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B1', 'B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.getByTestId('tab-properties').first().click()
    await expect(page.getByTestId('action-buy-house-B1').first()).toBeVisible({ timeout: 5000 })

    await page.getByTestId('action-buy-house-B1').first().click()
    await assertNoErrors(page, 'after buy house B1')

    await page.getByTestId('action-buy-house-B2').first().click()
    await assertNoErrors(page, 'after buy house B2')

    // Now sell B1 back
    await expect(page.getByTestId('action-sell-house-B1').first()).toBeVisible({ timeout: 3000 })
    await page.getByTestId('action-sell-house-B1').first().click()
    await assertNoErrors(page, 'after sell house B1')
  } finally {
    await deleteSession(sid)
  }
})
