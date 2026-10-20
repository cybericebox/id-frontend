// @vitest-environment jsdom
// The Google buttons of sign-in and sign-up tell Google which account to preselect when the page knows the address.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const query = vi.hoisted(() => ({ value: "" }))
vi.mock("@/lib/useGuestOnly", () => ({ useGuestOnly: () => {} }))
vi.mock("@/lib/useUrlParams", () => ({ useUrlParams: () => new URLSearchParams(query.value) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/sign-in", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

import { SignInScreen } from "./SignInScreen"
import { SignUpScreen } from "./SignUpScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

describe("Google start hint", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  const location = { href: "https://id.cybericebox.local/sign-in/" }
  beforeEach(() => {
    query.value = ""
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    vi.stubGlobal("location", location)
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  const googleButton = () => Array.from(host.querySelectorAll("button")).find((b) => b.querySelector("svg[viewBox='0 0 18 18']"))!
  const hintOf = (href: string) => new URL(href).searchParams.get("login_hint")

  it("sign-in: the address typed in the form", async () => {
    await act(async () => { root.render(<SignInScreen />) })
    await act(async () => { type(host.querySelector<HTMLInputElement>('input[type="email"]')!, "Olena@Example.com") })
    await act(async () => { googleButton().click() })
    expect(new URL(location.href).pathname).toBe("/api/auth/google")
    expect(hintOf(location.href)).toBe("olena@example.com")
  })

  it("sign-in: the caller's ?login_hint= prefills the field and goes to Google", async () => {
    query.value = "login_hint=invited%40example.com&return_to=https%3A%2F%2Fadmin.cybericebox.local%2F"
    await act(async () => { root.render(<SignInScreen />) })
    expect(host.querySelector<HTMLInputElement>('input[type="email"]')!.value).toBe("invited@example.com")
    await act(async () => { googleButton().click() })
    expect(hintOf(location.href)).toBe("invited@example.com")
    expect(new URL(location.href).searchParams.get("return_to")).toBe("https://admin.cybericebox.local/")
  })

  it("sign-up: the typed address, none when it is not an address", async () => {
    await act(async () => { root.render(<SignUpScreen />) })
    await act(async () => { googleButton().click() })
    expect(new URL(location.href).pathname).toBe("/api/auth/google/register")
    expect(hintOf(location.href)).toBeNull()
    await act(async () => { type(host.querySelector<HTMLInputElement>('input[type="email"]')!, "a@b.test") })
    await act(async () => { googleButton().click() })
    expect(hintOf(location.href)).toBe("a@b.test")
  })
})
