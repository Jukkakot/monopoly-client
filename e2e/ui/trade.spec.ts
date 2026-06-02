import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import { createHumanBotSession, createBotSession, getSnapshot, injectState, setBotSpeed, sendCmd, deleteSession } from '../helpers/api'
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

test('open trade button visible in WAITING_FOR_END_TURN → trade editing UI appears', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const humanSeat = humanSeatOf(snap0, humanPlayerId)

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

    // Open trade button visible on action tab
    await expect(page.getByTestId('action-open-trade').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-open-trade').first().click()

    // Trade editing panel opens: submit and cancel buttons appear
    await expect(page.getByTestId('action-submit-trade').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('action-cancel-trade').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

// For "received offer" tests: use a bot-only session where commands need no auth token.
// We navigate as player[0] by injecting their playerId into sessionStorage.
// Bot-only sessions accept any/no token (validatePlayerToken returns true when no human tokens exist).
async function navigateAsPlayer0(page: Page, sid: string, playerId: string) {
  await page.goto('/')
  await page.evaluate(({ sid, playerId }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
    sessionStorage.setItem(`monopoly_token_${sid}`, 'bot-session-no-token-needed')
  }, { sid, playerId })
  await page.goto(`/#/game/${sid}`)
}

test('received trade offer → accept/decline buttons visible', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const ids = snap0.state!.players.map(p => p.playerId)
    const [p0, p1] = ids

    // p1 opens trade, offers B2, requests B1, submits → p0 must accept/decline
    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
      ownedProperties: { 0: ['B1'], 1: ['B2'] },
      turn: { seat: 1, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await sendCmd(sid, { type: 'OpenTrade', actorPlayerId: p1, recipientPlayerId: p0 })
    const snap1 = await getSnapshot(sid)
    const tradeId = snap1.state!.tradeState!.tradeId
    await sendCmd(sid, { type: 'EditTradeOffer', actorPlayerId: p1, tradeId, patch: { offeredSide: true, propertyIdsToAdd: ['B2'] } })
    await sendCmd(sid, { type: 'EditTradeOffer', actorPlayerId: p1, tradeId, patch: { offeredSide: false, propertyIdsToAdd: ['B1'] } })
    await sendCmd(sid, { type: 'SubmitTradeOffer', actorPlayerId: p1, tradeId })

    // Navigate as p0 (the recipient) — should see accept/decline
    await navigateAsPlayer0(page, sid, p0)

    await expect(page.getByTestId('action-accept-trade').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('action-decline-trade').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('decline trade → buttons disappear, turn resumes', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const ids = snap0.state!.players.map(p => p.playerId)
    const [p0, p1] = ids

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }],
      ownedProperties: { 0: ['B1'], 1: ['B2'] },
      turn: { seat: 1, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await sendCmd(sid, { type: 'OpenTrade', actorPlayerId: p1, recipientPlayerId: p0 })
    const snap1 = await getSnapshot(sid)
    const tradeId = snap1.state!.tradeState!.tradeId
    await sendCmd(sid, { type: 'EditTradeOffer', actorPlayerId: p1, tradeId, patch: { offeredSide: true, propertyIdsToAdd: ['B2'] } })
    await sendCmd(sid, { type: 'SubmitTradeOffer', actorPlayerId: p1, tradeId })

    await navigateAsPlayer0(page, sid, p0)

    await expect(page.getByTestId('action-decline-trade').first()).toBeVisible({ timeout: 8000 })
    await page.getByTestId('action-decline-trade').first().click()

    // Trade closed → decline button gone
    await expect(page.getByTestId('action-decline-trade').first()).not.toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
