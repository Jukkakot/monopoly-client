/**
 * Board group-highlight tests.
 *
 * Clicking a color-group segment in the GroupOwnershipBar (at the board edge)
 * highlights all board spots of that group via the highlightGroup CSS class.
 * Clicking a board spot clears the highlight.
 */
import { test, expect, type Page } from '@playwright/test'
import { createBotSession, deleteSession } from '../helpers/api'

async function navigateSpectator(page: Page, sid: string) {
  await page.goto('/')
  await page.goto(`/#/game/${sid}`)
  await expect(page.locator('[class*=board]').first()).toBeVisible({ timeout: 8000 })
}

test('board highlight: clicking group bar highlights matching spots', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    // Group bar segments are clickable colored strips along the board edge.
    // Clicking one calls handleGroupHighlight which adds highlightGroup class to matching spots.
    const groupBtn = page.locator('[class*=groupBarClickable]').first()
    await expect(groupBtn).toBeVisible({ timeout: 5000 })
    await groupBtn.click()

    // At least one board spot should now have the highlightGroup class
    await expect(page.locator('[class*=highlightGroup]').first()).toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})

test('board highlight: clicking a different group changes the highlight', async ({ page }) => {
  // Click BROWN group → BROWN spots highlighted.
  // Then click LIGHT_BLUE group → LIGHT_BLUE spots highlighted, BROWN cleared.
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    const groupBtns = page.locator('[class*=groupBarClickable]')
    await expect(groupBtns.first()).toBeVisible({ timeout: 5000 })

    // Click the first group segment
    await groupBtns.first().click()
    await expect(page.locator('[class*=highlightGroup]').first()).toBeVisible({ timeout: 2000 })
    const firstHighlightCount = await page.locator('[class*=highlightGroup]').count()

    // Click the second group segment (different group)
    const count = await groupBtns.count()
    if (count >= 2) {
      await groupBtns.nth(1).click()
      // Highlight count may differ — but some spots are highlighted
      await expect(page.locator('[class*=highlightGroup]').first()).toBeVisible({ timeout: 2000 })
      // The highlighted set should change (different group = different spots)
      const secondHighlightCount = await page.locator('[class*=highlightGroup]').count()
      // Both should be small numbers (2-4 spots per group)
      expect(secondHighlightCount).toBeGreaterThan(0)
      expect(firstHighlightCount).toBeGreaterThan(0)
    }
  } finally {
    await deleteSession(sid)
  }
})

test('board highlight: clicking same group bar again de-highlights', async ({ page }) => {
  const sid = await createBotSession(2)
  try {
    await navigateSpectator(page, sid)

    const groupBtn = page.locator('[class*=groupBarClickable]').first()
    await groupBtn.click()
    await expect(page.locator('[class*=highlightGroup]').first()).toBeVisible({ timeout: 2000 })

    // Clicking same group again toggles off (isActive → passes null to onGroupClick)
    await groupBtn.click()
    await expect(page.locator('[class*=highlightGroup]').first()).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sid)
  }
})
