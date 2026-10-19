// @vitest-environment jsdom
// The session card on a phone: words never break in the middle (only the address may), and «Завершити» always sits
// in its own right column, aligned to the top, whatever the length of «Браузер · ОС».
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiGet: get }))

import { SessionsTab } from "./SessionsTab"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const CHROME = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"

describe("SessionsTab card layout", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
    get.mockResolvedValue([
      { ID: "a", UserAgent: CHROME, IP: "2001:db8:85a3:0000:0000:8a2e:0370:7334", LastSeen: "2026-10-19T16:16:00Z", CreatedAt: "2026-10-01T10:00:00Z", IsCurrent: true },
      { ID: "b", UserAgent: CHROME, IP: "10.0.0.1", LastSeen: "2026-10-18T16:16:00Z", CreatedAt: "2026-10-01T10:00:00Z", IsCurrent: false },
    ])
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it("breaks only the address anywhere, never the words of the meta line", async () => {
    await act(async () => { root.render(<SessionsTab />) })
    const items = host.querySelectorAll("li")
    expect(items).toHaveLength(2)
    expect(host.querySelector(".break-all")).toBeNull()
    const address = Array.from(host.querySelectorAll("li span")).find((s) => s.textContent === "2001:db8:85a3:0000:0000:8a2e:0370:7334")
    expect(address?.className).toContain("[overflow-wrap:anywhere]")
  })

  it("keeps «Завершити» in the right column of a two-column grid", async () => {
    await act(async () => { root.render(<SessionsTab />) })
    const other = host.querySelectorAll("li")[1]
    expect(other.className).toContain("grid-cols-[minmax(0,1fr)_auto]")
    const revoke = other.querySelector("button")!
    expect(revoke.parentElement).toBe(other)
    expect(revoke.className).toContain("self-start")
  })
})
