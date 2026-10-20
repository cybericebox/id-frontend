// @vitest-environment jsdom
// «Продовження реєстрації» with Google: the name comes prefilled from Google (never over what the user typed), and
// a Google account with another address gets an inline error that names the address to pick.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const replace = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ usePathname: () => "/setup/", useRouter: () => ({ replace, push: vi.fn() }) }))
vi.mock("@/lib/useGuestOnly", () => ({ useGuestOnly: () => {} }))

import { SetupScreen } from "./SetupScreen"
import { setupDraftKey } from "@/lib/storageKeys"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const setupInfo = (extra: object = {}) => ({ Email: "olena@example.com", FirstName: "Олена", LastName: "Коваль", HasProvider: true, ...extra })

describe("SetupScreen with Google", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    sessionStorage.clear()
    replace.mockReset()
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  const render = async (query: string, info: object) => {
    window.history.replaceState(null, "", `/setup/?${query}`)
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(
      JSON.stringify({ Status: { Code: 0 }, Data: url.includes("/api/auth/setup") ? info : null }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )))
    await act(async () => { root.render(<SetupScreen />) })
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  }
  const value = (name: string) => host.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value

  it("fills the name from Google when the saved draft has none", async () => {
    sessionStorage.setItem(setupDraftKey("tok"), JSON.stringify({ FirstName: "", LastName: "", AcceptTos: true }))
    await render("token=tok", setupInfo())
    expect(value("FirstName")).toBe("Олена")
    expect(value("LastName")).toBe("Коваль")
  })

  it("keeps what the user typed before the Google round-trip", async () => {
    sessionStorage.setItem(setupDraftKey("tok"), JSON.stringify({ FirstName: "Оля", LastName: "", AcceptTos: false }))
    await render("token=tok", setupInfo())
    expect(value("FirstName")).toBe("Оля")
    expect(value("LastName")).toBe("Коваль")
  })

  it("names the address to pick when Google returned another account", async () => {
    await render("token=tok&error=email_mismatch", setupInfo({ HasProvider: false, FirstName: "", LastName: "" }))
    const alert = Array.from(host.querySelectorAll('[role="alert"]')).map((a) => a.textContent).join(" ")
    expect(alert).toContain("Підключіть Google-акаунт з адресою olena@example.com")
  })
})
