import { test, expect } from '@playwright/test'
import { createBotSession, setBotSpeed, deleteSession } from '../helpers/api'

test('game loads in browser as spectator', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await setBotSpeed(sid, 'fast')
    await page.goto(`/#/game/${sid}`)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[class*="board"]').first()).toBeVisible()
  } finally {
    await deleteSession(sid)
  }
})
