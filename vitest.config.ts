import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        // Pure logic unit tests — no backend or DOM setup needed
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
          reporters: ['verbose'],
          maxWorkers: 4,
          sequence: { groupOrder: 1 },
        },
      },
      {
        // E2E-style rules tests against the real backend
        test: {
          name: 'rules',
          include: ['e2e/rules/**/*.test.ts'],
          globalSetup: './e2e/globalSetup.ts',
          testTimeout: 60_000,
          hookTimeout: 10_000,
          reporters: ['verbose'],
          pool: 'threads',
          maxWorkers: 2,
          retry: 1,
          sequence: { groupOrder: 2 },
        },
      },
    ],
  },
})
