import { test, expect, type Page } from '@playwright/test'
import { createHumanBotSession, createTwoHumanSession, getSnapshot, injectState, setBotSpeed, sendCmd, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

async function navigateAsHuman(page: Page, sid: string, playerId: string, token: string) {
  await page.goto('/')
  await page.evaluate(({ sid, playerId, token }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
    sessionStorage.setItem(`monopoly_token_${sid}`, token)
  }, { sid, playerId, token })
  await page.goto(`/#/game/${sid}`)
}

test('accept trade → ownership swaps visible in player list', async ({ page }) => {
  // Two-human session: offerer (p1) sends trade commands via API with their token,
  // recipient (p2) navigates in the browser and clicks accept. No bots means no race
  // condition where a fast bot would decline the offer before the page even loads.
  const { sid, p1: offerer, p2: recipient } = await createTwoHumanSession()
  try {
    const snap0 = await getSnapshot(sid)
    const offererSeat = snap0.state!.players.findIndex(p => p.playerId === offerer.playerId)
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

    await navigateAsHuman(page, sid, recipient.playerId, recipient.playerToken)

    // Accept the trade
    await expect(page.getByTestId('action-accept-trade').first()).toBeVisible({ timeout: 8000 })
    await page.getByTestId('action-accept-trade').first().click()

    // After accept: trade panel closes
    await expect(page.getByTestId('action-accept-trade').first()).not.toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('trade editing: submit button disabled when offer is empty', async ({ page }) => {
  const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
  try {
    await setBotSpeed(sid, 'fast')
    const snap0 = await getSnapshot(sid)
    const humanSeat = snap0.state!.players.findIndex(p => p.playerId === humanPlayerId)

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

    await expect(page.getByTestId('action-open-trade').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-open-trade').first().click()

    // Submit disabled when offer is empty
    await expect(page.getByTestId('action-submit-trade').first()).toBeDisabled({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
