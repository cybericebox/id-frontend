// @vitest-environment jsdom
// After a successful sign-in / setup the page is navigating away: the submit button stays busy, so a second click
// cannot start a second session.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const post = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiPost: post }))
vi.mock("@/lib/captcha", () => ({ executeCaptcha: async () => "token" }))
vi.mock("@/lib/useGuestOnly", () => ({ useGuestOnly: () => {} }))
vi.mock("@/lib/useUrlParams", () => ({ useUrlParams: () => new URLSearchParams("return_to=https%3A%2F%2Fexercises.cybericebox.local%2F") }))
vi.mock("next/navigation", () => ({ usePathname: () => "/sign-in", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

import { ResetPasswordScreen } from "./ResetPasswordScreen"
import { SignInScreen } from "./SignInScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

describe("sign-in submit", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  const assign = vi.fn()
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    vi.stubGlobal("location", { ...window.location, assign, href: "https://id.cybericebox.local/sign-in/" })
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    post.mockReset()
    assign.mockReset()
  })

  const submit = async () => {
    await act(async () => { root.render(<SignInScreen />) })
    await act(async () => {
      type(host.querySelector<HTMLInputElement>('input[type="email"]')!, "a@b.cd")
      type(host.querySelector<HTMLInputElement>('input[type="password"]')!, "secret")
    })
    await act(async () => { host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click() })
    return host.querySelector<HTMLButtonElement>('button[type="submit"]')!
  }

  it("stays busy while the browser navigates to the redirect", async () => {
    post.mockResolvedValue({ RedirectURL: "https://exercises.cybericebox.local/" })
    const button = await submit()
    expect(assign).toHaveBeenCalledWith("https://exercises.cybericebox.local/")
    expect(button.disabled).toBe(true)
    expect(button.getAttribute("aria-busy")).toBe("true")
  })

  it("is ready again after a failed sign-in", async () => {
    post.mockRejectedValue(new Error("nope"))
    const button = await submit()
    expect(assign).not.toHaveBeenCalled()
    expect(button.disabled).toBe(false)
  })

  it("keeps return_to on the recovery link", async () => {
    await act(async () => { root.render(<SignInScreen />) })
    const recover = Array.from(host.querySelectorAll("a")).find((a) => a.getAttribute("href")?.startsWith("/forgot-password"))
    expect(recover?.getAttribute("href")).toBe(`/forgot-password?return_to=${encodeURIComponent("https://exercises.cybericebox.local/")}`)
  })

  it("keeps return_to on the «request a new link» way out of the reset page", async () => {
    await act(async () => { root.render(<ResetPasswordScreen />) })
    const again = Array.from(host.querySelectorAll("a")).find((a) => a.getAttribute("href")?.startsWith("/forgot-password"))
    expect(again?.getAttribute("href")).toBe(`/forgot-password?return_to=${encodeURIComponent("https://exercises.cybericebox.local/")}`)
  })
})
