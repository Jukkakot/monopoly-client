/**
 * Overflow menu (⋯) and settings panel tests.
 * Uses a spectator bot session — no player token needed since the menu is always present.
 */
import { test, expect, type Page } from '@playwright/test'
import { createBotSession, deleteSession } from '../helpers/api'

async function navigateSpectator(page: Page, sid: string) {
  await page.goto('/')
  await page.goto(`/#/game/${sid}`)
  // Wait for game to load
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

// ─── Overflow menu ────────────────────────────────────────────────────────────

test('overflow menu: opens and shows expected items', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.getByTitle('Lisätoiminnot').first().click()

    await expect(page.getByRole('button', { name: /Asetukset/ })).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /Kopioi kutsu/ })).toBeVisible({ timeout: 2000 })
    await expect(page.getByRole('button', { name: /Poistu pelistä/ })).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('overflow menu: closes when clicking backdrop', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.getByTitle('Lisätoiminnot').first().click()
    await expect(page.getByRole('button', { name: /Asetukset/ })).toBeVisible({ timeout: 3000 })

    // Click the backdrop div that OverflowMenu renders to close the menu
    await page.locator('[class*=backdrop]').first().click({ force: true })
    await expect(page.getByRole('button', { name: /Asetukset/ })).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('overflow menu: leave game navigates to session list', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.getByTitle('Lisätoiminnot').first().click()
    await expect(page.getByRole('button', { name: /Poistu pelistä/ })).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: /Poistu pelistä/ }).click()

    await expect(page).toHaveURL(/\/#\/$|#\/$/, { timeout: 5000 })
    await expect(page.getByRole('button', { name: '+ Uusi peli' })).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sid)
  }
})

// ─── Settings panel ───────────────────────────────────────────────────────────

test('settings panel: opens from overflow menu and shows key elements', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.getByTitle('Lisätoiminnot').first().click()
    await page.getByRole('button', { name: /Asetukset/ }).click()

    // Panel title
    await expect(page.getByText('⚙️ Asetukset').first()).toBeVisible({ timeout: 3000 })

    // Volume slider
    await expect(page.locator('input[type=range]').first()).toBeVisible({ timeout: 2000 })
    await expect(page.getByText('Volyymi')).toBeVisible({ timeout: 2000 })

    // Network latency row
    await expect(page.getByText('Verkkolatenssi')).toBeVisible({ timeout: 2000 })

    // Save button
    await expect(page.getByRole('button', { name: 'Tallenna' })).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('settings panel: closes with ✕ button', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.getByTitle('Lisätoiminnot').first().click()
    await page.getByRole('button', { name: /Asetukset/ }).click()
    await expect(page.getByText('⚙️ Asetukset').first()).toBeVisible({ timeout: 3000 })

    // The close button's accessible name is its aria-label (t.closeLabel = "Sulje"),
    // which overrides the visible "✕" glyph for role queries.
    await page.getByRole('button', { name: 'Sulje' }).first().click()

    await expect(page.getByText('Volyymi')).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('settings panel: closes with Tallenna button', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.getByTitle('Lisätoiminnot').first().click()
    await page.getByRole('button', { name: /Asetukset/ }).click()
    await expect(page.getByRole('button', { name: 'Tallenna' })).toBeVisible({ timeout: 3000 })

    await page.getByRole('button', { name: 'Tallenna' }).click()

    await expect(page.getByText('Volyymi')).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('settings panel: checkboxes toggle sound categories', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    await page.getByTitle('Lisätoiminnot').first().click()
    await page.getByRole('button', { name: /Asetukset/ }).click()
    await expect(page.getByText('Volyymi')).toBeVisible({ timeout: 3000 })

    // Find checkboxes — should be multiple (sound categories + notifications)
    const checkboxes = page.locator('input[type=checkbox]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(3)

    // Toggle first checkbox
    const first = checkboxes.first()
    const wasChed = await first.isChecked()
    await first.click()
    await expect(first).toBeChecked({ checked: !wasChed })
  } finally {
    await deleteSession(sid)
  }
})
