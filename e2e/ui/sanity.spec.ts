import { test, expect } from '@playwright/test'
import { createBotSession, deleteSession } from '../helpers/api'

// Fast smoke tests. These run before the full suite via project dependencies.
// If any of these fail the entire chromium project is skipped, saving time when
// the backend is down or the frontend has a fundamental rendering problem.

test('frontend loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Helsinki Edition').first()).toBeVisible({ timeout: 5000 })
})

test('backend API: can create and delete a session', async () => {
  const sid = await createBotSession(2)
  await deleteSession(sid)
  // If either throws, the session API is broken
})

test('SSE pipeline: state delivered to frontend within 8s', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await page.goto(`/#/game/${sid}`)
    // player-0-cash appears only after SSE delivers the initial SessionState
    await expect(page.getByTestId('player-0-cash').first()).toContainText('1500', { timeout: 8000 })
  } finally {
    await deleteSession(sid)
  }
})
