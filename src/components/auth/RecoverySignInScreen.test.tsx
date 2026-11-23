// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const post = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiPost: post }))
const search = vi.hoisted(() => ({ value: "" }))
vi.mock("@/lib/useUrlParams", () => ({ useUrlParams: () => new URLSearchParams(search.value) }))
vi.mock("@/lib/useGuestOnly", () => ({ useGuestOnly: () => {} }))
vi.mock("@/lib/captcha", () => ({ executeCaptcha: async () => "none" }))

import { ApiError } from "@/api/client"
import { RecoverySignInScreen } from "./RecoverySignInScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("RecoverySignInScreen", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  const assign = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    search.value = ""
    vi.stubGlobal("location", { ...window.location, assign, href: "https://id.cybericebox.local/sign-in/recovery/" })
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals() })

  const type = async (el: HTMLInputElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    })
  }
  const fill = async () => {
    await type(host.querySelector<HTMLInputElement>('input[type="email"]')!, "olena@example.com")
    await type(host.querySelector<HTMLInputElement>('input[type="password"]')!, "pw")
    await type(host.querySelector<HTMLInputElement>('input[name="Code"]')!, "aaaa-bbbb-cccc")
  }
  const submit = async () => {
    await act(async () => { host.querySelector("form")!.requestSubmit() })
    await act(async () => {})
  }

  it("signs in with the password and the code, landing on the security section by default", async () => {
    await act(async () => { root.render(<RecoverySignInScreen />) })
    await fill()
    post.mockResolvedValueOnce({ RedirectURL: "https://id.cybericebox.local/profile/?tab=security" })
    await submit()
    expect(post).toHaveBeenCalledWith("/api/auth/sign-in/recovery", {
      Email: "olena@example.com", Password: "pw", Code: "AAAA-BBBB-CCCC", RecaptchaToken: "none",
      Redirect: "https://id.cybericebox.local/profile/?tab=security",
    }, undefined, { required: false })
    expect(assign).toHaveBeenCalledWith("https://id.cybericebox.local/profile/?tab=security")
  })

  it("keeps a return_to", async () => {
    search.value = "return_to=https%3A%2F%2Fadmin.cybericebox.local%2F"
    await act(async () => { root.render(<RecoverySignInScreen />) })
    await fill()
    post.mockResolvedValueOnce({ RedirectURL: "" })
    await submit()
    expect(post.mock.calls[0][1].Redirect).toBe("https://admin.cybericebox.local/")
    expect(assign).toHaveBeenCalledWith("https://admin.cybericebox.local/")
  })

  it("a failure is one form-level message (it never says which part was wrong)", async () => {
    await act(async () => { root.render(<RecoverySignInScreen />) })
    await fill()
    post.mockRejectedValueOnce(new ApiError(401, null, undefined, undefined, 53807))
    await submit()
    expect(host.textContent).toContain("Не вдалося увійти за кодом відновлення")
    expect(host.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
    expect(assign).not.toHaveBeenCalled()
  })

  it("the code field checks the form before sending", async () => {
    await act(async () => { root.render(<RecoverySignInScreen />) })
    await type(host.querySelector<HTMLInputElement>('input[type="email"]')!, "olena@example.com")
    await type(host.querySelector<HTMLInputElement>('input[type="password"]')!, "pw")
    await type(host.querySelector<HTMLInputElement>('input[name="Code"]')!, "abc")
    await submit()
    expect(post).not.toHaveBeenCalled()
    expect(host.querySelector<HTMLInputElement>('input[name="Code"]')!.getAttribute("aria-invalid")).toBe("true")
  })
})
