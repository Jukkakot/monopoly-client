/**
 * Property action tests — build house / mortgage via the PropertyDetail panel,
 * and opening PropertyDetail from a player list property chip.
 *
 * The PropertyDetail shows action buttons when the viewer IS the owner:
 *   - "🏠 Rakenna talo"  — visible when player has a full monopoly, unmortgaged
 *   - "🏦 Panttaa"       — visible when property is owned and unmortgaged
 *   - "−🏠 Myy talo"    — visible when player can sell a house (even-build rule)
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

// ─── Mortgage from PropertyDetail ────────────────────────────────────────────

test('property actions: mortgage button visible for owned unmortgaged property', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1'] },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })

    await expect(page.getByRole('button', { name: /Panttaa/ })).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('property actions: mortgage increases cash', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1000, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1000, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1'] },  // B1 = Katajanokka, price €60, mortgage = €30
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    // Verify initial cash via player list
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€1000', { timeout: 5000 })

    // Open detail and mortgage
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Panttaa/ }).click()

    // Cash increases by €30 (mortgage value = price / 2 = 60/2 = 30)
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€1030', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

// ─── Build from PropertyDetail ────────────────────────────────────────────────

test('property actions: build button visible for owned full monopoly', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Full BROWN monopoly (B1 + B2) required for building
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1', 'B2'] },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })

    await expect(page.getByRole('button', { name: /Rakenna talo/ })).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('property actions: building a house from detail reduces cash', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // BROWN monopoly (B1 + B2). House cost on BROWN = €50
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1000, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1000, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1', 'B2'] },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€1000', { timeout: 5000 })

    // Open B1 and build a house
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Rakenna talo/ }).click()

    // Panel closes after buying; cash decreases by house cost (€50)
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€950', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('property actions: mortgage badge shown on PropertyDetail when property is mortgaged', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Inject B1 as already mortgaged
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1000, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1000, boardIndex: 0 }],
      ownedProperties: { [seat]: ['B1'] },
      propertyOverrides: { B1: { mortgaged: true } },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.locator('[data-spot-id="B1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Katajanokka' })).toBeVisible({ timeout: 3000 })

    // Mortgaged badge visible in the PropertyDetail owner row
    await expect(page.getByText('PANTATTU', { exact: true }).first()).toBeVisible({ timeout: 2000 })

    // Unmortgage/redeem button visible (redeemBtn = '💳 Lunasta')
    await expect(page.getByRole('button', { name: /Lunasta/ })).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})
