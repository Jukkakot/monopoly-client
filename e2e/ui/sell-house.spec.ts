/**
 * Sell house via PropertyDetail panel tests.
 *
 * The "−🏠 Myy talo" button appears in PropertyDetail when:
 *   - The viewer is the property owner
 *   - The property is a street (not railroad/utility)
 *   - The property has at least 1 house
 *   - The house count equals the maximum in the group (even-build rule)
 *
 * Selling reduces houseCount by 1 and adds half the house cost to player cash.
 * For BROWN, house cost = €50, so selling 1 house gives +€25.
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createHumanBotSession, getSnapshot,
  injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

const DETAIL_HEADER = '[class*=headerName]'

async function navigateAsHuman(page: Page, sid: string, pid: string, token: string) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, pid, token })
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

function humanSeat(snap: Awaited<ReturnType<typeof getSnapshot>>, pid: string): number {
  return snap.state!.seats.find(s => s.playerId === pid)!.seatIndex
}

test('sell house: sell button visible when property has house and even-build rule met', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Full BROWN monopoly with 1 house on each property (even-build: both have same level)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 1 }, B2: { houseCount: 1 } },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })

    // Sell button visible
    await expect(page.getByRole('button', { name: /Myy talo/ })).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('sell house: selling a house increases cash by half house cost', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // BROWN with 1 house each. House cost = €50, sell value = €25.
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1000, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1000, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 1 }, B2: { houseCount: 1 } },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€1000', { timeout: 5000 })

    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Myy talo/ }).click()

    // Sell gives back €25 (half of €50 house cost): €1000 + €25 = €1025
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€1025', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('sell house: sell button NOT visible when house level below group maximum', async ({ page }) => {
  // Even-build rule: can only sell from B1 if B2 has same or fewer houses.
  // If B1=2 houses, B2=1 house → can't sell from B1 (would make it uneven)
  // But CAN sell from B1 if B2 has same count (2=2).
  // Test: B1=1, B2=0 → can't sell from B1 (maxLevelInGroup=1 for B1, but B2=0 < B1=1 already)
  // Actually the rule: canSell = myLevelHere > 0 && myLevelHere >= maxLevelInGroup
  // With B1=1, B2=0: maxLevelInGroup = max(1,0) = 1 = myLevelHere → CAN sell from B1 ✓
  // With B1=2, B2=1: maxLevelInGroup = 2 = myLevelHere → CAN sell from B1 ✓
  // With B1=1, B2=2: maxLevelInGroup = 2 > myLevelHere=1 → CANNOT sell from B1 ✓
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // B1=1, B2=2 → maxLevelInGroup=2, B1 myLevel=1 → sell NOT allowed for B1
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1', 'B2'] },
      propertyOverrides: { B1: { houseCount: 1 }, B2: { houseCount: 2 } },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })

    // Sell button should NOT be visible for B1 (its level is below B2's max)
    await expect(page.getByRole('button', { name: /Myy talo/ })).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})
