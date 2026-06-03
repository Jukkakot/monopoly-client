import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import { createHumanBotSession, createBotSession, getSnapshot, injectState, setBotSpeed, deleteSession } from '../helpers/api'
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

test('pass GO → cash increases by €200', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at position 37 (DB1/Keilaniemi), dice [2,1]=3 → 40%40=0 (GO) → cash +€200
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 37 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 37 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],  // sum=3 → 37+3=40 → 40%40=0 = GO
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // 1500 + 200 (GO bonus) = 1700
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1700', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('free parking — no cash change, end-turn available', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at position 15 (RR2), dice [2,3]=5 → 20 = FREE_PARKING (no effect)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 15 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 15 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 3],  // sum=5, non-doubles → 15+5=20 = FREE_PARKING
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Free parking: no cash change, end-turn appears
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1500', { timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('go to jail corner → player jailed (jail badge visible)', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at position 27 (Y2/Leppävaara), dice [2,1]=3 → 30 = GO_TO_JAIL corner
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 27 }, { cash: 1500, boardIndex: 0 }]
        : [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 27 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [2, 1],  // sum=3 → 27+3=30 = GO_TO_JAIL
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Jail: cash unchanged, end-turn button appears (WAITING_FOR_END_TURN after jail)
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1500', { timeout: 3000 })
    // Jail badge "🔒3v" visible in player list (jailRoundsRemaining=3)
    await expect(page.getByText('🔒3v').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('spectator: player cash values all visible', async ({ page }) => {
  const sid = await createBotSession(3)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [
        { cash: 111, boardIndex: 0 },
        { cash: 222, boardIndex: 10 },
        { cash: 333, boardIndex: 20 },
      ],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    // All 3 cash values from inject visible via SSE
    await expect(page.getByTestId('player-0-cash').first()).toContainText('111', { timeout: 8000 })
    await expect(page.getByTestId('player-1-cash').first()).toContainText('222', { timeout: 5000 })
    await expect(page.getByTestId('player-2-cash').first()).toContainText('333', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('spectator: action-roll button not visible', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    // Spectator should not see any action buttons
    await expect(page.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})
