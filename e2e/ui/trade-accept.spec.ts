import { test, expect, type Page } from '@playwright/test'
import { createBotSession, getSnapshot, injectState, setBotSpeed, sendCmd, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

// Bot-only sessions accept any token — navigate as player 0 without real auth.
async function navigateAsPlayer0(page: Page, sid: string, playerId: string) {
  await page.goto('/')
  await page.evaluate(({ sid, playerId }) => {
    sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
    sessionStorage.setItem(`monopoly_token_${sid}`, 'bot-no-token')
  }, { sid, playerId })
  await page.goto(`/#/game/${sid}`)
}

test('accept trade → ownership swaps visible in player list', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'slow')
    const snap0 = await getSnapshot(sid)
    const [p0, p1] = snap0.state!.players.map(p => p.playerId)

    // p1 owns B2, p0 owns B1 — p1 offers B2 for B1
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

    await navigateAsPlayer0(page, sid, p0)

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
  const { sid, humanPlayerId, humanPlayerToken } = await (await import('../helpers/api')).createHumanBotSession()
  try {
    await setBotSpeed(sid, 'slow')
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

    await page.goto('/')
    await page.evaluate(({ sid, playerId, token }) => {
      sessionStorage.setItem(`monopoly_player_${sid}`, playerId)
      sessionStorage.setItem(`monopoly_token_${sid}`, token)
    }, { sid, playerId: humanPlayerId, token: humanPlayerToken })
    await page.goto(`/#/game/${sid}`)

    await expect(page.getByTestId('action-open-trade').first()).toBeVisible({ timeout: 5000 })
    await page.getByTestId('action-open-trade').first().click()

    // Submit disabled when offer is empty
    await expect(page.getByTestId('action-submit-trade').first()).toBeDisabled({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})
