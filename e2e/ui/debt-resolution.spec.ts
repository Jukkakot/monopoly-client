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

/**
 * Scenario: human has €1, owns B1 (mortgage value €25).
 * Bot owns R1 (position 5, 1 railroad, rent €25 > €1 → debt €24).
 * Human at position 0, dice [3,2]=5 → R1 (bot's railroad).
 * LC1 is at position 6 which the human could own too, but B1 is simpler.
 */
function debtScenario(humanSeat: number) {
  const botSeat = 1 - humanSeat
  return {
    description: '', rules: [],
    players: humanSeat === 0
      ? [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
      : [{ cash: 1500, boardIndex: 10 }, { cash: 1, boardIndex: 0 }],
    ownedProperties: { [humanSeat]: ['B1'], [botSeat]: ['RR1'] } as Record<number, string[]>,
    turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
    forcedDice: [3, 2] as [number, number],  // sum=5 → position 5 = RR1 (bot railroad), rent €25 > €1 → debt
    expectedAfter: {},
  }
}

test('debt panel: mortgage button visible for owned unmortgaged property', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch(debtScenario(humanSeat), snap0))
    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    await expect(page.getByTestId('debt-panel').first()).toBeVisible({ timeout: 8000 })
    // B1 mortgage button visible in debt panel (human owns B1, can mortgage to raise cash)
    await expect(page.getByTestId('action-mortgage-for-debt-B1').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('debt panel: mortgage property → cash increases', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    await injectState(sid, buildPatch(debtScenario(humanSeat), snap0))
    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    await expect(page.getByTestId('debt-panel').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('action-mortgage-for-debt-B1').first()).toBeVisible({ timeout: 3000 })
    await page.getByTestId('action-mortgage-for-debt-B1').first().click()

    // B1 list price = €60 → mortgage value = €30 → cash: €1 + €30 = €31
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('31', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
