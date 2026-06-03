/**
 * Lobby join flow tests — a second player navigates to an existing waiting room,
 * fills in their name, and joins. Covers the join form UI and the transition to
 * the ready state after joining.
 */
import { test, expect, type Page } from '@playwright/test'
import { deleteSession } from '../helpers/api'

const BASE = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** Create a lobby without starting it — returns sessionId and hostToken */
async function createOpenLobby(): Promise<{ sessionId: string; hostToken: string; playerId: string; playerToken: string }> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST', headers: JSON_HEADERS,
    body: JSON.stringify({ lobbyMode: true, hostName: 'TestHost', hostColor: '#e53935' }),
  })
  if (!res.ok) throw new Error(`createOpenLobby failed: ${res.status}`)
  return res.json()
}

// ─── Join form UI ─────────────────────────────────────────────────────────────

test('lobby join: visitor sees join form when arriving without credentials', async ({ page }) => {
  const { sessionId } = await createOpenLobby()
  try {
    // Navigate as a stranger (no sessionStorage credentials)
    await page.goto(`/#/lobby-wait/${sessionId}`)

    // Join form appears for non-members
    await expect(page.getByText('Liity peliin')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('input[type=text]').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: 'Liity' })).toBeVisible({ timeout: 2000 })

    // Host seat visible in seat list
    await expect(page.getByText('TestHost')).toBeVisible({ timeout: 5000 })
  } finally {
    await deleteSession(sessionId)
  }
})

test('lobby join: Liity button disabled until name is entered', async ({ page }) => {
  const { sessionId } = await createOpenLobby()
  try {
    await page.goto(`/#/lobby-wait/${sessionId}`)
    await expect(page.getByRole('button', { name: 'Liity' })).toBeVisible({ timeout: 8000 })

    // Clear any pre-filled name
    await page.locator('input[type=text]').first().fill('')
    await expect(page.getByRole('button', { name: 'Liity' })).toBeDisabled({ timeout: 2000 })

    // Fill name → enabled
    await page.locator('input[type=text]').first().fill('Testi')
    await expect(page.getByRole('button', { name: 'Liity' })).toBeEnabled({ timeout: 2000 })
  } finally {
    await deleteSession(sessionId)
  }
})

test('lobby join: player joins lobby, sees ready button after reload', async ({ page }) => {
  const { sessionId } = await createOpenLobby()
  try {
    await page.goto(`/#/lobby-wait/${sessionId}`)
    await expect(page.getByRole('button', { name: 'Liity' })).toBeVisible({ timeout: 8000 })

    // Fill in name and join
    await page.locator('input[type=text]').first().fill('Testi')
    await page.getByRole('button', { name: 'Liity' }).click()

    // LobbyWaitingScreen reloads after join to pick up credentials
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/lobby-wait/, { timeout: 8000 })

    // After reload, player is joined → ready button visible
    await expect(page.getByRole('button', { name: 'Olen valmis' })).toBeVisible({ timeout: 8000 })

    // Join form is gone
    await expect(page.getByText('Liity peliin')).not.toBeVisible({ timeout: 2000 })
  } finally {
    await deleteSession(sessionId)
  }
})

test('lobby join: two players both join and one marks ready', async ({ page }) => {
  const { sessionId, playerId: hostId, playerToken: hostToken } = await createOpenLobby()
  try {
    // Second player (page) navigates and joins
    await page.goto(`/#/lobby-wait/${sessionId}`)
    await expect(page.getByRole('button', { name: 'Liity' })).toBeVisible({ timeout: 8000 })

    await page.locator('input[type=text]').first().fill('Pelaaja2')
    await page.getByRole('button', { name: 'Liity' }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: 'Olen valmis' })).toBeVisible({ timeout: 8000 })

    // Player2 marks ready
    await page.getByRole('button', { name: 'Olen valmis' }).click()
    await expect(page.getByRole('button', { name: 'Peru valmius' })).toBeVisible({ timeout: 5000 })

    // Host marks ready via API → game auto-starts (2 players, all humans ready)
    await fetch(`${BASE}/sessions/${sessionId}/lobby/ready`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ playerId: hostId, playerToken: hostToken, ready: true }),
    })

    // Player2's page navigates to the game screen automatically via SSE
    await expect(page).toHaveURL(/\/#\/game\//, { timeout: 10000 })
  } finally {
    await deleteSession(sessionId)
  }
})
