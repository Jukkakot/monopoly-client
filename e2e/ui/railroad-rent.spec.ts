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

test('land on bot railroad (1 owned) → rent €25 charged', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Bot owns RR1 (position 5, 1 railroad = €25 rent). Human at GO, dice [3,2]=5 → RR1.
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['RR1'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],  // sum=5 → position 5 = RR1
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Rent €25 charged: 1500 - 25 = 1475
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1475', { timeout: 5000 })
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('land on bot railroad (2 owned) → rent €50 charged', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Bot owns RR1+RR2 (2 railroads = €50 rent). Human at GO, dice [3,2]=5 → RR1.
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['RR1', 'RR2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],  // sum=5 → position 5 = RR1
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Rent €50 charged: 1500 - 50 = 1450
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1450', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('land on unowned railroad → buy decision panel', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // RR1 is unowned. Human at GO, dice [3,2]=5 → RR1 → WAITING_FOR_DECISION
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Landed on unowned RR1 → buy decision
    await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('action-decline').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})
