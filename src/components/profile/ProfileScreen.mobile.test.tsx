// @vitest-environment jsdom
// The phone profile is master-detail: the list of sections, then one section. The identity card shows only on the
// list, and «Назад до розділів» never leaves a loop in the history.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), replace: vi.fn(), back: vi.fn() }))
const get = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiGet: get }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: nav.back }),
  useSearchParams: () => nav.params,
}))

import { ProfileScreen } from "./ProfileScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const account = {
  ID: "u1", FirstName: "Olena", LastName: "Koval", Email: "olena@example.test", Picture: "", EmailConfirmed: true,
  Role: "user", Providers: [], HasPassword: true, CreatedAt: "2026-06-27T10:00:00Z",
}

describe("ProfileScreen on a phone", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    nav.params = new URLSearchParams()
    nav.push.mockReset(); nav.replace.mockReset(); nav.back.mockReset()
    get.mockImplementation(async (path: string) => (path === "/api/auth/account" ? account : []))
    // phone: the desktop media query does not match
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  const render = async () => { await act(async () => { root.render(<ProfileScreen />) }) }
  const button = (text: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes(text))
  const memberSince = () => host.textContent?.includes("На платформі з")

  it("shows the identity card on the list of sections only", async () => {
    await render()
    expect(memberSince()).toBe(true)
    nav.params = new URLSearchParams("tab=sessions")
    await render()
    expect(button("Назад до розділів")).toBeDefined()
    expect(memberSince()).toBe(false)
  })

  it("goes back in the history when the section was opened from the list", async () => {
    await render()
    await act(async () => { button("Сеанси")!.click() })
    expect(nav.push).toHaveBeenCalledWith("/profile?tab=sessions", { scroll: false })
    nav.params = new URLSearchParams("tab=sessions")
    await render()
    await act(async () => { button("Назад до розділів")!.click() })
    expect(nav.back).toHaveBeenCalledTimes(1)
    expect(nav.push).toHaveBeenCalledTimes(1)
  })

  it("replaces the entry when the section came from a link", async () => {
    nav.params = new URLSearchParams("tab=sessions")
    await render()
    await act(async () => { button("Назад до розділів")!.click() })
    expect(nav.back).not.toHaveBeenCalled()
    expect(nav.push).not.toHaveBeenCalled()
    expect(nav.replace).toHaveBeenCalledWith("/profile", { scroll: false })
  })
})
