// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.hoisted(() => vi.fn())
const del = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiGet: get, apiDelete: del }))
const search = vi.hoisted(() => ({ value: "" }))
vi.mock("@/lib/useUrlParams", () => ({ useUrlParams: () => new URLSearchParams(search.value) }))
vi.mock("@/lib/useGuestOnly", () => ({ useGuestOnly: () => {} }))
vi.mock("next/navigation", () => ({ usePathname: () => "/sign-in/", useRouter: () => ({ replace: vi.fn() }) }))

import { SignInScreen } from "./SignInScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("sign-in: last address", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    vi.clearAllMocks()
    search.value = ""
    // the last address is functional: it is asked for only with functional consent
    document.cookie = "cib_consent=analytics:denied,functional:granted; path=/"
    del.mockResolvedValue(undefined)
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })
  const email = () => host.querySelector<HTMLInputElement>('input[type="email"]')!

  it("fills the field in full when the answer comes; «Увійти з іншою адресою» clears it, focuses it and forgets the address", async () => {
    get.mockResolvedValue({ Email: "olena@example.com" })
    await act(async () => { root.render(<SignInScreen />) })
    expect(email().value).toBe("olena@example.com")
    const other = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Увійти з іншою адресою")!
    await act(async () => { other.click() })
    expect(del).toHaveBeenCalledWith("/api/auth/last-email", undefined, undefined, undefined)
    expect(email().value).toBe("")
    expect(document.activeElement).toBe(email())
  })

  it("leaves the field alone when the caller gave a login_hint or the answer is empty or fails", async () => {
    search.value = "login_hint=hint%40example.com"
    get.mockResolvedValue({ Email: "olena@example.com" })
    await act(async () => { root.render(<SignInScreen />) })
    expect(email().value).toBe("hint@example.com")
    act(() => root.unmount())
    root = createRoot(host)
    search.value = ""
    get.mockRejectedValue(new Error("down"))
    await act(async () => { root.render(<SignInScreen />) })
    expect(email().value).toBe("")
  })

  it("asks for nothing without functional consent", async () => {
    document.cookie = "cib_consent=analytics:denied,functional:denied; path=/"
    get.mockResolvedValue({ Email: "olena@example.com" })
    await act(async () => { root.render(<SignInScreen />) })
    expect(get).not.toHaveBeenCalled()
    expect(email().value).toBe("")
  })
})
