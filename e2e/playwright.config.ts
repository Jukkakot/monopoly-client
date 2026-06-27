import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './ui',
  globalSetup: './globalSetup.ts',
  retries: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium',
    },
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
