/**
 * Language toggle (FI/EN) tests.
 *
 * The Header shows a 🌐/flag button that toggles between Finnish and English.
 * Switching language changes all UI labels immediately via LanguageContext.
 * The choice is persisted in localStorage ('monopoly_lang' key).
 */
import { test, expect, type Page } from '@playwright/test'
import { createBotSession, deleteSession } from '../helpers/api'

async function navigateSpectator(page: Page, sid: string) {
  await page.goto('/')
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

test('language: default UI is in Finnish', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // Finnish spectator message visible by default
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('language: toggle button switches to English', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 5000 })

    // Language toggle button: title "Vaihda englanniksi" when in Finnish mode
    await page.getByTitle('Vaihda englanniksi').first().click()

    // UI switches to English
    await expect(page.getByText('You are a spectator').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('language: toggle back to Finnish from English', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // Switch to English
    await page.getByTitle('Vaihda englanniksi').first().click()
    await expect(page.getByText('You are a spectator').first()).toBeVisible({ timeout: 3000 })

    // Switch back to Finnish
    await page.getByTitle('Switch to Finnish').first().click()
    await expect(page.getByText('Olet katsojana').first()).toBeVisible({ timeout: 3000 })
  } finally {
    await deleteSession(sid)
  }
})

test('language: choice persists after page reload', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // Switch to English
    await page.getByTitle('Vaihda englanniksi').first().click()
    await expect(page.getByText('You are a spectator').first()).toBeVisible({ timeout: 3000 })

    // Reload
    await page.reload()
    await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })

    // Still in English after reload
    await expect(page.getByText('You are a spectator').first()).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

test('language: session list screen also switches language', async ({ page }) => {
  await page.goto('/')

  // Default is Finnish
  await expect(page.getByRole('button', { name: '+ Uusi peli' })).toBeVisible({ timeout: 8000 })

  // Toggle language
  await page.getByTitle('Vaihda englanniksi').click()

  // Session list switches to English
  await expect(page.getByRole('button', { name: '+ New game' })).toBeVisible({ timeout: 3000 })
})
