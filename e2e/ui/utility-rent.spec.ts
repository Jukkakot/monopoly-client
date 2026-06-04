/**
 * Utility rent and PropertyDetail tests for UTILITY spots.
 *
 * Utilities (Sähkölaitos U1, Vesilaitos U2) charge rent as a dice multiple:
 *   - 1 utility owned → 4× dice total
 *   - 2 utilities owned → 10× dice total
 *
 * PropertyDetail shows these rent rules ("4× nopat" / "10× nopat").
 * The debt panel shows the actual rent after landing.
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

// ─── PropertyDetail for utilities ────────────────────────────────────────────

test('utility: PropertyDetail shows "4× nopat" when 1 utility owned', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Human owns U1 (Sähkölaitos) only
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [seat]: ['U1'] },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.locator('[data-spot-id="U1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Sähkölaitos' })).toBeVisible({ timeout: 3000 })

    // 1 utility owned → small multiplier shown
    await expect(page.getByText('4× nopat').first()).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('utility: PropertyDetail shows "10× nopat" when both utilities owned', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Human owns both U1 and U2
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [seat]: ['U1', 'U2'] },
      turn: { seat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await page.locator('[data-spot-id="U1"]').click()
    await expect(page.locator(DETAIL_HEADER).filter({ hasText: 'Sähkölaitos' })).toBeVisible({ timeout: 3000 })

    // Both utilities owned → large multiplier shown
    await expect(page.getByText('10× nopat').first()).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('utility: landing on opponent-owned utility deducts rent automatically', async ({ page }) => {
  // Forced dice [4,2] → sum=6, utility rent = 4×6 = €24 (only 1 utility owned).
  // Player has enough cash → auto-pays without debt panel.
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)
    const botSeat = seat === 0 ? 1 : 0

    // U1 (Sähkölaitos) is at board index 12.
    // Human at index 6 (LB1=Kallio), dice [4,2]=6 → lands at 12 (U1). Non-doubles.
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1000, boardIndex: 6 }, { cash: 1000, boardIndex: 20 }]
        : [{ cash: 1000, boardIndex: 20 }, { cash: 1000, boardIndex: 6 }],
      ownedProperties: { [botSeat]: ['U1'] },
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [4, 2],   // sum=6, non-doubles → lands on index 12 (U1)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€1000', { timeout: 5000 })
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    await page.getByTestId('action-roll').first().click()

    // Rent = 4 × (4+2) = €24. Cash decreases from €1000 to €976.
    await expect(page.getByTestId(`player-${seat}-cash`).first()).toContainText('€976', { timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})
