/**
 * Chance and Community Chest card UI tests.
 *
 * When a player lands on a card spot the turn phase becomes WAITING_FOR_CARD_ACK.
 * The active player sees a popup (action panel card overlay) with "✓ Selvä".
 * Other players/spectators see the other-player observer panel.
 *
 * Tests inject WAITING_FOR_CARD_ACK state directly so no actual rolling is needed.
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createHumanBotSession, getSnapshot,
  injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateAsHuman(page: Page, sid: string, pid: string, token: string) {
  await page.goto('/')
  await page.evaluate(({ sid, pid, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, pid)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, pid, token })
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

function humanSeat(snap: ReturnType<typeof Object.create>, pid: string): number {
  return snap.state!.seats.find((s: { playerId: string; seatIndex: number }) => s.playerId === pid)!.seatIndex
}

// ─── Card popup shown to the active player ───────────────────────────────────

test('cards: chance card popup shown when it is the human player\'s turn', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Force human onto a Chance spot with a forced card
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 7 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 7 }],
      turn: { seat, phase: 'WAITING_FOR_CARD_ACK' },
      // Use a simple advance card that doesn't move to jail
      forcedChanceCard: 'ADVANCE_TO_GO',
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // Card popup with "✓ Selvä" button visible in action panel
    await expect(page.getByText('✓ Selvä')).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('cards: community chest card popup shown for human player', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Force human onto Community Chest spot (index 2) with a card
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 2 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 2 }],
      turn: { seat, phase: 'WAITING_FOR_CARD_ACK' },
      forcedCommunityCard: 'BANK_ERROR_COLLECT',
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByText('✓ Selvä')).toBeVisible({ timeout: 5000 })
    // Card icon visible in panel
    await expect(page.getByText('🃏').first()).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('cards: acknowledge card advances to next phase', async ({ page }) => {
  // Must land on CHANCE via actual roll so that pendingCardEffect is populated.
  // Player at GO, forcedDice [4,3]=7 → lands on CHANCE1 (boardIndex 7).
  // forcedChanceCard 'MONEY:0' is a simple give-money card.
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
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [4, 3],          // 7 → CHANCE1
      forcedChanceCard: 'MONEY:0', // simple give-money card, always safe
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    // Roll → land on CHANCE1 → draw card → WAITING_FOR_CARD_ACK
    await page.getByTestId('action-roll').first().click()
    // Two '✓ Selvä' elements appear: board bubble (button) + action panel (div).
    // Use the button role to target the board bubble; both trigger AcknowledgeCard.
    await expect(page.getByRole('button', { name: '✓ Selvä' })).toBeVisible({ timeout: 8000 })

    await page.getByRole('button', { name: '✓ Selvä' }).click()

    // Both popup elements disappear — end-turn button appears
    await expect(page.getByRole('button', { name: '✓ Selvä' })).not.toBeVisible({ timeout: 8000 })
    await expect(
      page.getByTestId('action-end-turn').or(page.getByTestId('action-roll')).first()
    ).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
