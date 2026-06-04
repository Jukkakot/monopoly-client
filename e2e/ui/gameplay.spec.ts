import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import { createHumanBotSession, createBotSession, getSnapshot, injectState, setBotSpeed, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

/**
 * Navigate to the game as the human player.
 * Sets sessionStorage credentials so GameContext sends authorized commands
 * and renders action buttons (Roll, EndTurn, Buy etc.) instead of spectator view.
 */
async function navigateAsHuman(page: Page, sid: string, humanPlayerId: string, humanPlayerToken: string) {
  await page.goto('/')
  await page.evaluate(({ sid, playerId, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, playerId: humanPlayerId, token: humanPlayerToken })
  await page.goto(`/#/game/${sid}`)
}

/** Returns the snapshot index of the human player (0 or 1). */
function humanSeatOf(snap: ClientSessionSnapshot, humanPlayerId: string): number {
  const idx = snap.state!.players.findIndex(p => p.playerId === humanPlayerId)
  if (idx === -1) throw new Error(`humanSeatOf: player ${humanPlayerId} not found in snapshot`)
  return idx
}

test('roll button → end-turn button: ActionPanel päivittyy nopan heiton jälkeen', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Human owns B2 → landing on own property → no rent/decision → WAITING_FOR_END_TURN
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [humanSeat]: ['B2'] },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],   // sum=3 → B2 (own) → WAITING_FOR_END_TURN
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-end-turn').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('buy button: Buy-nappi ostaa kiinteistön ja kassa pienenee', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

    // Human at GO, no properties, dice [1,2]=3 → B2 (unowned) → WAITING_FOR_DECISION
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('action-buy').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-buy').first().click()

    // After buying B2 (€60): cash = 1500 − 60 = 1440
    await expect(page.getByTestId(`player-${humanSeat}-cash`).first()).toContainText('1440', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('SSE tilainjektion kautta: injektoitu kassa ja faasi näkyy UI:ssa', async ({ page }) => {
  // Tests that injectState fires an SSE event that the frontend processes and renders.
  // Uses the same pipeline as all other state changes: inject → SSE → GameContext → DOM.
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    // Navigate BEFORE inject so SSE is already connected when the update fires
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 8000 })

    const snap0 = await getSnapshot(sid)
    // Inject distinctive cash values that are easy to assert in the DOM
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [{ cash: 555, boardIndex: 0 }, { cash: 777, boardIndex: 10 }],
      turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
      expectedAfter: {},
    }, snap0))

    // Both injected cash values must appear in the player list (delivered via SSE).
    // This verifies the full pipeline: inject → SSE event → GameContext reducer → DOM render.
    await expect(page.getByTestId('player-0-cash').first()).toContainText('555', { timeout: 8000 })
    await expect(page.getByTestId('player-1-cash').first()).toContainText('777', { timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('debt panel: velkapaneeli näkyy kun pelaajalla ei ole varaa vuokraan', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)
    const botSeat = 1 - humanSeat

    // Human has €1, bot owns full BROWN with hotel on B2 (rent €450 → debt)
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: humanSeat === 0
        ? [{ cash: 1, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1, boardIndex: 0 }],
      ownedProperties: { [botSeat]: ['B1', 'B2'] },
      propertyOverrides: { B2: { hotelCount: 1 } },
      turn: { seat: humanSeat, phase: 'WAITING_FOR_ROLL' },
      forcedDice: [1, 2],   // sum=3 → B2 (bot's, hotel) → RESOLVING_DEBT
      expectedAfter: {},
    }, snap0))

    await navigateAsHuman(page, sid, humanPlayerId, humanPlayerToken)

    // Human clicks Roll → lands on B2 → can't afford rent → debt panel appears via SSE
    await expect(page.getByTestId('action-roll').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-roll').first().click()
    await expect(page.getByTestId('debt-panel').first()).toBeVisible({ timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})
