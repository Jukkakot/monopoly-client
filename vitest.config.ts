import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['e2e/rules/**/*.test.ts'],
    globalSetup: './e2e/globalSetup.ts',
    testTimeout: 15_000,
    hookTimeout: 10_000,
    reporters: ['verbose'],
    pool: 'threads',
    maxWorkers: 4,
  },
})
