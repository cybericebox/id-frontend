// @vitest-environment jsdom
// Linking Google from the profile takes only the account's own address: when Google returned another account the
// connections section names the address to pick, right under «Підключити Google».
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ConnectionsTab } from "./ConnectionsTab"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const account = { ID: "u1", FirstName: "A", LastName: "B", Email: "olena@example.com", Picture: "", EmailConfirmed: true, Role: "user", Providers: [], HasPassword: true, CreatedAt: "" }

describe("ConnectionsTab link errors", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it("email_mismatch: an inline error with the account address, tied to the connect button", async () => {
    await act(async () => { root.render(<ConnectionsTab account={account} linkError="email_mismatch" onUpdated={() => {}} />) })
    const error = host.querySelector("#connect-google-mismatch")
    expect(error?.getAttribute("role")).toBe("alert")
    expect(error?.textContent).toContain("Підключіть Google-акаунт з адресою olena@example.com")
    const connect = Array.from(host.querySelectorAll("button")).find((b) => b.getAttribute("aria-describedby") === "connect-google-mismatch")
    expect(connect).toBeDefined()
    expect(host.textContent).not.toContain("Не вдалося підключити")
  })

  it("link_failed keeps the general error; no error without a code", async () => {
    await act(async () => { root.render(<ConnectionsTab account={account} linkError="link_failed" onUpdated={() => {}} />) })
    expect(host.querySelector("#connect-google-mismatch")).toBeNull()
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    await act(async () => { root.render(<ConnectionsTab key="none" account={account} linkError={null} onUpdated={() => {}} />) })
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })
})
