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

test('landing on railroad (1 owned) → rent €25 deducted', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Bot owns RR1 (1 railroad) → rent = €25. Human at 0, dice [3,2]=5 → position 5 = RR1
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['RR1'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],  // sum=5 → 0+5=5 = RR1 (bot owns, 1 railroad → rent €25)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Rent paid: 1500 - 25 = 1475
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1475', { timeout: 5000 })
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('landing on monopoly BROWN (no houses) → double rent €8 deducted', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Bot owns full BROWN monopoly (B1+B2, no houses) → B2 monopoly rent = €4×2 = €8
    // Human at 0, dice [1,2]=3 → position 3 = B2
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['B1', 'B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],  // sum=3 → 0+3=3 = B2 (bot's monopoly → rent €8)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Monopoly rent: 1500 - 8 = 1492
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1492', { timeout: 5000 })
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})
