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

test('buy 4 houses on BROWN monopoly: all buy buttons enabled, sell buttons appear', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns full BROWN with 3 houses on B1, 3 on B2 (even building enforced)
    // Can still buy one more on each (up to 4)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 3 }, B2: { houseCount: 3 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tab-properties').first().click()

    // Both buy buttons visible (can buy 4th house)
    await expect(page.getByTestId('action-buy-house-B1').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('action-buy-house-B2').first()).toBeVisible({ timeout: 3000 })
    // Sell buttons also visible (have 3 houses each)
    await expect(page.getByTestId('action-sell-house-B1').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('action-sell-house-B2').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('buy 5th house → converts to hotel, buy buttons disappear', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns full BROWN with 4 houses on B1, 4 on B2
    // Next buy on either → hotel (houseCount=0, hotelCount=1)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 4 }, B2: { houseCount: 4 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tab-properties').first().click()

    await expect(page.getByTestId('action-buy-house-B1').first()).toBeVisible({ timeout: 3000 })
    await page.getByTestId('action-buy-house-B1').first().click()

    // After buying 5th house on B1 → hotel. Buy button for B1 disappears (hotelCount=1, no more building)
    // Cash: 1500 - 50 = 1450 (BROWN house cost = €50)
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1450', { timeout: 5000 })
    await expect(page.getByTestId('action-buy-house-B1').first()).not.toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('sell house from 4-house property → sell button visible, cash +25', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // B1 and B2 both have 4 houses — sell button visible (even-build allows selling from any)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 4 }, B2: { houseCount: 4 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('tab-properties').first().click()

    // Sell button visible for B1 (4 houses, at max level)
    await expect(page.getByTestId('action-sell-house-B1').first()).toBeVisible({ timeout: 3000 })
    await page.getByTestId('action-sell-house-B1').first().click()

    // Sell 1 house from B1 (BROWN sell price = €25 = half of €50) → cash 1500+25=1525
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1525', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
