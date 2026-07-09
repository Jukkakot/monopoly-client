import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

// The Claude Code web sandbox ships a pre-installed Chromium at this fixed path. On CI
// (and normal dev machines) it doesn't exist — there `npx playwright install` provides
// the browser, so we must NOT force this path or launch fails with
// "executable doesn't exist at /opt/pw-browsers/chromium".
const sandboxChromium = '/opt/pw-browsers/chromium'

export default defineConfig({
  testDir: './ui',
  globalSetup: './globalSetup.ts',
  retries: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    launchOptions: existsSync(sandboxChromium)
      ? { executablePath: sandboxChromium }
      : {},
  },
  projects: [
    {
      name: 'sanity',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/sanity.spec.ts',
      retries: 0,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/sanity.spec.ts',
      dependencies: ['sanity'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
    cwd: '../',
  },
})
