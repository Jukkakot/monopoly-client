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

test('go to jail: landing on Go To Jail corner sends player to jail', async ({ page }) => {
  // Go To Jail (GOT OJ corner) is at board index 30.
  // Human at index 27, dice [2,1]=3 → lands at 30 (non-doubles, so no extra roll).
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 27 }, { cash: 1500, boardIndex: 5 }]
        : [{ cash: 1500, boardIndex: 5 }, { cash: 1500, boardIndex: 27 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],   // sum=3, non-doubles → index 27+3=30 (Go To Jail)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    await page.getByTestId('action-roll').first().click()

    // Player is jailed — jail lock badge appears in player list
    await expect(page.getByText('🔒').first()).toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})

test('doubles from jail → player escapes without paying fine, cash unchanged', async ({ page }) => {
  // Rolling doubles while in jail releases the player for free.
  // Key: no €50 fine is charged, and the jail badge disappears.
  // Verified via API snapshot rather than UI buttons (backend auto-processes the move).
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }, { cash: 1500, boardIndex: 5 }]
        : [{ cash: 1500, boardIndex: 5 }, { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [5, 5],   // doubles → from jail(10) + 10 = index 20 (FREE_PARKING)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    // Roll — doubles from jail
    await page.getByTestId('action-roll').first().click()

    // Player released — jail badge disappears from the player list
    await expect(page.getByText('🔒').first()).not.toBeVisible({ timeout: 8000 })

    // Cash still €1500 — no fine was paid for the jail escape
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1500', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('use GOOJF card → jail card button disappears, roll button stays', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2, getOutOfJailCards: 1 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 2, getOutOfJailCards: 1 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-use-jail-card').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-use-jail-card').first().click()

    // Card consumed → jail card button gone, roll button remains (need to still roll)
    await expect(page.getByTestId('action-use-jail-card').first()).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('pay jail fine → fine button disappears, roll button stays, cash -50', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 200, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 200, boardIndex: 10, inJail: true, jailRoundsRemaining: 2 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-pay-jail-fine').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-pay-jail-fine').first().click()

    // Fine paid: 200 - 50 = 150
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('150', { timeout: 5000 })
    // Fine button gone, roll button still there
    await expect(page.getByTestId('action-pay-jail-fine').first()).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('jail last turn — only roll button visible (no fine, no card)', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // jailRoundsRemaining=1 → last turn → pay fine button hidden (forced auto-pay on roll)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 1 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10, inJail: true, jailRoundsRemaining: 1 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // Last round: no pay-fine button (isLastRound=true hides it), roll is the only option
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('action-pay-jail-fine').first()).not.toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})
