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
  if (idx === -1) throw new Error(`humanSeatOf: player ${humanPlayerId} not found`)
  return idx
}

test('buy house button visible with full monopoly in WAITING_FOR_END_TURN', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Human owns full BROWN monopoly (B1+B2), WAITING_FOR_END_TURN
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

    // Switch to properties tab to see building buttons
    await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tab-properties').first().click()

    // Buy house buttons visible for both BROWN properties
    await expect(page.getByTestId('action-buy-house-B1').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('action-buy-house-B2').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('buy house → house count increases, cash decreases', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns full BROWN monopoly, WAITING_FOR_END_TURN
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

    await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tab-properties').first().click()

    await expect(page.getByTestId('action-buy-house-B1').first()).toBeVisible({ timeout: 3000 })
    await page.getByTestId('action-buy-house-B1').first().click()

    // After buying a house on B1 (cost €50 for BROWN): cash drops by 50
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1450', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('sell house → cash increases', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns full BROWN monopoly with 1 house on B1, WAITING_FOR_END_TURN
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 1 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tab-properties').first().click()

    // Sell button visible for B1 (has 1 house)
    await expect(page.getByTestId('action-sell-house-B1').first()).toBeVisible({ timeout: 3000 })
    await page.getByTestId('action-sell-house-B1').first().click()

    // Sell price = €25 (half of €50 buy price for BROWN)
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1525', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
