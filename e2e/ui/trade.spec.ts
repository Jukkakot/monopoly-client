import { test, expect, type Page } from '@playwright/test'
import type { ClientSessionSnapshot } from '../../src/types/api'
import { createHumanBotSession, createTwoHumanSession, getSnapshot, injectState, setBotSpeed, sendCmd, deleteSession } from '../helpers/api'
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
    await setBotSpeed(sid, 'fast')
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

// "Received offer" tests use a two-human session: p1 (offerer) sends commands via API
// with their playerToken, p2 (recipient) navigates in the browser. No bots means no
// race conditions — fast bots used to cancel/decline the trade before the page loaded.
test('received trade offer → accept/decline buttons visible', async ({ page }) => {
  const { sid, p1: offerer, p2: recipient } = await createTwoHumanSession()
  try {
    const snap0 = await getSnapshot(sid)
    const offererSeat = humanSeatOf(snap0, offerer.playerId)
    const recipientSeat = 1 - offererSeat

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: offererSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [offererSeat]: ['B2'], [recipientSeat]: ['B1'] },
      turn: { seat: offererSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await sendCmd(sid, { type: 'OpenTrade', actorPlayerId: offerer.playerId, playerToken: offerer.playerToken, recipientPlayerId: recipient.playerId })
    const snap1 = await getSnapshot(sid)
    const tradeId = snap1.state!.tradeState!.tradeId
    await sendCmd(sid, { type: 'EditTradeOffer', actorPlayerId: offerer.playerId, playerToken: offerer.playerToken, tradeId, patch: { offeredSide: true, propertyIdsToAdd: ['B2'] } })
    await sendCmd(sid, { type: 'EditTradeOffer', actorPlayerId: offerer.playerId, playerToken: offerer.playerToken, tradeId, patch: { offeredSide: false, propertyIdsToAdd: ['B1'] } })
    await sendCmd(sid, { type: 'SubmitTradeOffer', actorPlayerId: offerer.playerId, playerToken: offerer.playerToken, tradeId })

    // Navigate as recipient — should see accept/decline
    await navigateAsHuman(page, sid, recipient.playerId, recipient.playerToken)

    await expect(page.getByTestId('action-accept-trade').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('action-decline-trade').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('decline trade → buttons disappear, turn resumes', async ({ page }) => {
  const { sid, p1: offerer, p2: recipient } = await createTwoHumanSession()
  try {
    const snap0 = await getSnapshot(sid)
    const offererSeat = humanSeatOf(snap0, offerer.playerId)
    const recipientSeat = 1 - offererSeat

    await injectState(sid, buildPatch({
      description: '', rules: [],
      players: offererSeat === 0
        ? [{ cash: 1500, boardIndex: 0 }, { cash: 1500, boardIndex: 10 }]
        : [{ cash: 1500, boardIndex: 10 }, { cash: 1500, boardIndex: 0 }],
      ownedProperties: { [offererSeat]: ['B2'], [recipientSeat]: ['B1'] },
      turn: { seat: offererSeat, phase: 'WAITING_FOR_END_TURN' },
      expectedAfter: {},
    }, snap0))

    await sendCmd(sid, { type: 'OpenTrade', actorPlayerId: offerer.playerId, playerToken: offerer.playerToken, recipientPlayerId: recipient.playerId })
    const snap1 = await getSnapshot(sid)
    const tradeId = snap1.state!.tradeState!.tradeId
    await sendCmd(sid, { type: 'EditTradeOffer', actorPlayerId: offerer.playerId, playerToken: offerer.playerToken, tradeId, patch: { offeredSide: true, propertyIdsToAdd: ['B2'] } })
    await sendCmd(sid, { type: 'SubmitTradeOffer', actorPlayerId: offerer.playerId, playerToken: offerer.playerToken, tradeId })

    await navigateAsHuman(page, sid, recipient.playerId, recipient.playerToken)

    await expect(page.getByTestId('action-decline-trade').first()).toBeVisible({ timeout: 8000 })
    await page.getByTestId('action-decline-trade').first().click()

    // Trade closed → decline button gone
    await expect(page.getByTestId('action-decline-trade').first()).not.toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
