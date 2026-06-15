/**
 * id-frontend smoke tests — NOT executed during `npm run build` or CI.
 *
 * These tests REQUIRE a fully running local dev-environment:
 *   - daemon (Go server) listening on its configured port
 *   - id-frontend (Next dev server) on http://localhost:3001
 *   - main-frontend (if testing cross-origin SSO flows)
 *   - Subdomain DNS: id.<domain> → 127.0.0.1 (or /etc/hosts entry)
 *
 * Run with:
 *   E2E_BASE_URL=http://localhost:3001 npx playwright test
 *
 * All tests are marked test.fixme() so they are skipped unless explicitly
 * un-fixed or overridden with --grep. This prevents accidental execution in CI.
 */

import { test, expect } from "@playwright/test"

// Guard: if E2E_BASE_URL is not set, skip the entire suite gracefully.
const E2E_ENABLED = !!process.env.E2E_BASE_URL

test.describe("id-frontend smoke — requires local dev-env", () => {
  /**
   * (a) Register → setup → signed-in flow.
   *
   * Steps:
   *   1. Navigate to /register
   *   2. Enter a test email → submit → check email state shown
   *   3. (Manual step in real run) Follow verification link → /setup
   *   4. Complete setup form (first name, last name, password) → submit
   *   5. Assert redirect to /profile and profile heading visible
   */
  test.fixme(
    "register → setup → signed-in",
    async ({ page }) => {
      if (!E2E_ENABLED) test.skip()

      await page.goto("/register")
      await expect(page.locator("h1, [data-testid='register-title']")).toBeVisible()

      // Fill and submit registration form
      await page.getByLabel(/email/i).fill("smoke-test@example.local")
      await page.getByRole("button", { name: /send/i }).click()

      // Expect "check your email" state
      await expect(page.getByText(/check your email/i)).toBeVisible()

      // NOTE: completing /setup requires intercepting the verification email.
      // In a real smoke run, use a mailhog/mailpit instance and follow the link.
      test.info().annotations.push({
        type: "note",
        description:
          "Complete this test by integrating a local mail catcher (mailpit) to retrieve the verification link.",
      })
    }
  )

  /**
   * (b) Sign-in flow.
   *
   * Steps:
   *   1. Navigate to /sign-in
   *   2. Enter credentials for a pre-seeded test account
   *   3. Submit → assert redirect to /profile
   *   4. Assert profile heading is visible (authenticated state)
   */
  test.fixme(
    "sign-in with credentials",
    async ({ page }) => {
      if (!E2E_ENABLED) test.skip()

      await page.goto("/sign-in")
      await expect(page.getByRole("heading")).toBeVisible()

      await page.getByLabel(/email/i).fill(process.env.E2E_TEST_EMAIL ?? "test@example.local")
      await page.getByLabel(/password/i).fill(process.env.E2E_TEST_PASSWORD ?? "password123")
      await page.getByRole("button", { name: /sign in/i }).click()

      // Expect navigation to /profile after successful sign-in
      await page.waitForURL(/\/profile/)
      await expect(page.getByRole("heading", { name: /account/i })).toBeVisible()
    }
  )

  /**
   * (c) Profile page loads for an authenticated user.
   *
   * Prereq: E2E_BASE_URL points at a running id-frontend with an active session
   * (e.g. set via cookie injection or by running after the sign-in test).
   *
   * Steps:
   *   1. Navigate to /profile
   *   2. Assert the profile heading is visible (not redirected to /sign-in)
   *   3. Assert at least one tab is present
   */
  test.fixme(
    "profile page loads for authenticated user",
    async ({ page }) => {
      if (!E2E_ENABLED) test.skip()

      await page.goto("/profile")

      // If not authenticated, the page redirects to /sign-in — that's a failure.
      await page.waitForURL(/\/profile/)

      await expect(page.getByRole("heading", { name: /account/i })).toBeVisible()

      // At least one tab nav button should be present
      await expect(page.getByRole("button", { name: /profile/i }).first()).toBeVisible()
    }
  )
})
