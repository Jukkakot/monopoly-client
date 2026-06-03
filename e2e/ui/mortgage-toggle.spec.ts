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

async function goToPropertiesTab(page: Page) {
  await expect(page.getByTestId('tab-properties').first()).toBeVisible({ timeout: 5000 })
  await page.getByTestId('tab-properties').first().click()
}

test('mortgage property from properties tab → cash increases', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns B1 alone (no monopoly), WAITING_FOR_END_TURN — can mortgage
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B1'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await goToPropertiesTab(page)

    // Mortgage button for B1 (testId from MortgageToggle chip in BuildingButtons)
    // The mortgage toggle in the properties panel uses data-testid="mortgage-toggle-{propId}"
    // Check what's actually rendered
    await expect(page.getByText('Katajanokka').first()).toBeVisible({ timeout: 5000 })

    // Find mortgage button — it's a chip with the property name + mortgage value
    // Looking for the toggle mortgage action in BuildingButtons
    const mortgageBtn = page.getByTestId('mortgage-toggle-B1').first()
    await expect(mortgageBtn).toBeVisible({ timeout: 3000 })
    await mortgageBtn.click()

    // B1 mortgage value = €30 → cash: 1500 + 30 = 1530
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1530', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('unmortgage property from properties tab → cash decreases', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human owns B1 already mortgaged, WAITING_FOR_END_TURN — can unmortgage
    // B1 unmortgage cost = ceil(30 * 1.1) = 33
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B1'] },
      propertyOverrides: { B1: { mortgaged: true } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await goToPropertiesTab(page)

    // Mortgaged B1 chip shows "lunasta €33"
    const unmortgageBtn = page.getByTestId('mortgage-toggle-B1').first()
    await expect(unmortgageBtn).toBeVisible({ timeout: 5000 })
    await unmortgageBtn.click()

    // Unmortgage cost €33 → cash: 1500 - 33 = 1467
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1467', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
