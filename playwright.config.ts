/**
 * Playwright configuration for id-frontend smoke tests.
 *
 * Tests under e2e/ are SKIPPED by default in CI / npm run build.
 * They require a running local dev-env (daemon + id-frontend + main-frontend +
 * subdomain DNS pointing id.<domain> at 127.0.0.1).
 *
 * To run locally:
 *   E2E_BASE_URL=http://localhost:3001 npx playwright test
 *
 * NOTE: `playwright install` (browser download) is NOT run as part of
 * npm install — run it manually before executing these tests.
 */

import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001"

export default defineConfig({
  testDir: "./e2e",
  // Never run during `next build` — e2e/ is outside src/ and Next ignores it.
  // This config is only picked up when `playwright test` is invoked directly.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: process.env.E2E_CHROME_PATH || undefined },
      },
    },
  ],
})
