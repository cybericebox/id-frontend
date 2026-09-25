import { expect, test } from "@playwright/test"

test("a short API restart does not show the outage notice", async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL to the running ID frontend")

  let apiUp = false
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: apiUp ? 401 : 500,
    contentType: "application/json",
    body: "{}",
  }))

  await page.goto("/sign-in")
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await page.waitForTimeout(1000)
  apiUp = true
  await page.waitForTimeout(3200)
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(page).toHaveURL(/\/sign-in$/)
})

test("an existing session returns to the requested page after an API outage", async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL to the running ID frontend")

  let apiUp = false
  await page.route("**/api/auth/me", async (route) => {
    if (!apiUp) {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ Status: { Message: "unavailable" } }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Data: { ID: "user-1", Role: "admin", Permissions: [] } }) })
  })
  await page.route("https://localhost/dashboard", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>Dashboard restored</h1>" }))

  await page.goto(`/sign-in?return_to=${encodeURIComponent("https://localhost/dashboard")}`)
  const notice = page.getByRole("alertdialog")
  await expect(notice).toBeVisible()
  await expect(page).toHaveURL(/\/sign-in\?/)

  apiUp = true
  await notice.getByRole("button").click()
  await expect(page).toHaveURL("https://localhost/dashboard")
  await expect(page.getByRole("heading", { name: "Dashboard restored" })).toBeVisible()
})
