import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './ui',
  globalSetup: './globalSetup.ts',
  retries: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
    cwd: '../',
  },
})
