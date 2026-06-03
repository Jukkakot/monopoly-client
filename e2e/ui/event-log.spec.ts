/**
 * Event log tests — verifies that game events appear in the log sidebar
 * and mobile log tab after game actions.
 *
 * The event log renders in:
 *   - Desktop: right sidebar under "📋 Tapahtumaloki"
 *   - Mobile: the "Loki" tab panel
 *
 * The `data-testid="event-log"` container is present in both.
 */
import { test, expect, type Page } from '@playwright/test'
import {
  createHumanBotSession, createBotSession, getSnapshot,
  injectState, setBotSpeed, deleteSession,
} from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateSpectator(page: Page, sid: string) {
  await page.goto('/')
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

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

// ─── Desktop sidebar log ──────────────────────────────────────────────────────

test('event log: sidebar log section visible on desktop', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // Desktop sidebar section header
    await expect(page.getByText('📋 Tapahtumaloki').first()).toBeVisible({ timeout: 5000 })

    // Event log container present
    await expect(page.getByTestId('event-log').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('event log: dice roll creates log entry with player name and result', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)
    const playerName = snap0.state!.players.find(p => p.playerId === humanPlayerId)!.name

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })

    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-roll').first()).not.toBeVisible({ timeout: 8000 })

    // Log entry: "{name} heitti {d1}+{d2}={total}" — check for player name in log
    const logEl = page.getByTestId('event-log').first()
    await expect(logEl.getByText(new RegExp(playerName + ' heitti')).first()).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('event log: income tax landing creates log entry', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // TAX1 (Tulovero) is at board index 4. Human at index 0, dice [3,1]=4 → lands at TAX1.
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [3, 1],   // sum=4 → TAX1 (index 4)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // After landing on tax, player must end turn
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 8000 })

    // Movement event: "{name} → Tulovero" appears in the log
    const logEl = page.getByTestId('event-log').first()
    await expect(logEl.getByText(/Tulovero/).first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('event log: buy property creates log entry', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const seat = humanSeat(snap0, humanPlayerId)

    // Human at index 0, dice [1,0]... minimum is [1,1]=2, lands at B2 (index 3). B2 is BROWN unowned.
    // Actually [1,2]=3 → lands at B2 (index 3).
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: seat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],   // sum=3 → B2 = Kruunuhaka (index 3, unowned, price €60)
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()

    // Buy the property
    await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 8000 })
    await page.getByTestId('action-buy').first().click()

    // Log should contain property name
    const logEl = page.getByTestId('event-log').first()
    await expect(logEl.getByText(/Kruunuhaka/).first()).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
