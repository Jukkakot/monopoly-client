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

test('end-turn button → turn advances to opponent', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human's turn, WAITING_FOR_END_TURN — bot at seat 1 just waiting
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 20 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 20 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-end-turn').first().click()

    // After end turn: it's the bot's turn → human no longer sees end-turn button
    await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 5000 })
    // Fast bot will act and return to human's roll — wait for roll button to reappear.
    // Generous timeout: the bot's turn runs against the live (sometimes cold) backend.
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 20000 })
  } finally {
    await deleteSession(sid)
  }
})

test('rolling doubles → end-turn button appears (not roll again)', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns B2 — rolling [1,1]=2 lands on B2 (own property) with doubles
    // After landing on own property with doubles: WAITING_FOR_ROLL (extra turn)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 1 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 1 }],
      ownedProperties: { [humanSeat]: ['B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 1],  // doubles, sum=2 → position 1+2=3 = B2 (own) → WAITING_FOR_ROLL
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Doubles on own property → extra turn → roll button comes back, not end-turn
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('action-end-turn').first()).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('income tax (position 4) → cash -200', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at B1 (position 1), dice [2,1]=3 → position 4 = TAX1 (Tulovero, -€200)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 1 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 1 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],  // sum=3, non-doubles → 1+3=4 = TAX1
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Tax deducted: 1500 - 200 = 1300
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1300', { timeout: 5000 })
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('roll on own property → end-turn button (no decision panel)', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns B2, dice [1,2]=3 → lands on B2 (own property) → WAITING_FOR_END_TURN directly
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // sum=3 → 0+3=3 = B2 (own) → no decision
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Own property → no buy/decline decision → goes straight to WAITING_FOR_END_TURN
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('action-buy').first()).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('luxury tax (position 38) → cash -100', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at position 33, dice [3,2]=5 → position 38 = TAX2 (Ylellisyysvero, -€100)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 33 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 33 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],  // sum=5, non-doubles → 33+5=38 = TAX2
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Luxury tax: 1500 - 100 = 1400
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1400', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
