// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.hoisted(() => vi.fn())
const post = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiGet: get, apiPost: post }))
const search = vi.hoisted(() => ({ value: "" }))
vi.mock("@/lib/useUrlParams", () => ({ useUrlParams: () => new URLSearchParams(search.value) }))
const passkey = vi.hoisted(() => ({ supported: false, get: vi.fn() }))
vi.mock("@/lib/passkey", async (orig) => ({
  ...(await orig<typeof import("@/lib/passkey")>()),
  passkeysSupported: () => passkey.supported,
  getPasskey: passkey.get,
}))

import { ApiError } from "@/api/client"
import type { SecondFactorStatus } from "@/api/secondFactor"
import { StepUpScreen } from "./StepUpScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const off: SecondFactorStatus = {
  TOTPEnabled: false, TOTPConfirmedAt: null, Passkeys: 0, RecoveryCodesLeft: 0, HasSecondFactor: false,
  StepUpMethod: null, StepUpExpiresAt: null,
}
const RETURN = "https://admin.cybericebox.local/users?x=1"

describe("StepUpScreen", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  const assign = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    passkey.supported = false
    search.value = `return_to=${encodeURIComponent(RETURN)}`
    vi.stubGlobal("location", { ...window.location, assign, href: "https://id.cybericebox.local/step-up/", origin: "https://id.cybericebox.local" })
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals() })

  const label = (b: Element) => (b.querySelector(".ib-btn__face") ?? b).textContent?.trim()
  const button = (text: string) => Array.from(host.querySelectorAll("button")).find((b) => label(b) === text)
  const type = async (el: HTMLInputElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    })
  }
  const render = async (status: SecondFactorStatus, hasPassword = true) => {
    get.mockImplementation(async (path: string) => (path === "/api/auth/second-factor" ? status : { HasPassword: hasPassword }))
    await act(async () => { root.render(<StepUpScreen />) })
  }
  const submit = async () => {
    await act(async () => { host.querySelector("form")!.requestSubmit() })
  }

  it("confirms with the authenticator code and goes back to return_to", async () => {
    await render({ ...off, TOTPEnabled: true, HasSecondFactor: true })
    expect(host.querySelector('input[type="password"]')).toBeNull()
    await type(host.querySelector<HTMLInputElement>("#step-up-code")!, "123456")
    post.mockResolvedValueOnce({ Method: "totp", At: "", ExpiresAt: "" })
    await submit()
    expect(post).toHaveBeenCalledWith("/api/auth/step-up", { Method: "totp", Code: "123456" })
    expect(assign).toHaveBeenCalledWith(RETURN)
  })

  it("a wrong code stays beside the field, nothing navigates", async () => {
    await render({ ...off, TOTPEnabled: true, HasSecondFactor: true })
    await type(host.querySelector<HTMLInputElement>("#step-up-code")!, "000000")
    post.mockRejectedValueOnce(new ApiError(400, null, undefined, undefined, 23808))
    await submit()
    const field = host.querySelector<HTMLInputElement>("#step-up-code")!
    expect(field.getAttribute("aria-invalid")).toBe("true")
    expect(host.querySelector(`#${field.getAttribute("aria-describedby")}`)!.textContent).toBe("Підтвердження не вдалося")
    expect(assign).not.toHaveBeenCalled()
  })

  it("an account without a factor confirms with its password; a foreign return_to falls back to the profile", async () => {
    search.value = "return_to=https%3A%2F%2Fevil.test%2F"
    await render(off)
    await type(host.querySelector<HTMLInputElement>('input[type="password"]')!, "pw")
    post.mockResolvedValueOnce({ Method: "password", At: "", ExpiresAt: "" })
    await submit()
    expect(post).toHaveBeenCalledWith("/api/auth/step-up", { Method: "password", Password: "pw" })
    expect(assign).toHaveBeenCalledWith("/profile/")
  })

  it.each([
    "https://api.cybericebox.local/api/auth/me",
    "javascript:alert(1)",
    "http://admin.cybericebox.local/",
    "//evil.test/",
    "https://user:pw@admin.cybericebox.local/",
  ])("return_to %s is not followed: the profile instead", async (bad) => {
    search.value = `return_to=${encodeURIComponent(bad)}`
    await render({ ...off, TOTPEnabled: true, HasSecondFactor: true })
    await type(host.querySelector<HTMLInputElement>("#step-up-code")!, "123456")
    post.mockResolvedValueOnce({ Method: "totp", At: "", ExpiresAt: "" })
    await submit()
    expect(assign).toHaveBeenCalledWith("/profile/")
    const back = Array.from(host.querySelectorAll("a")).find((a) => a.textContent === "Повернутися без підтвердження")!
    expect(back.getAttribute("href")).toBe("/profile/")
  })

  it("a passkey is the choice when it is the only factor; its check requires user verification on the server", async () => {
    passkey.supported = true
    await render({ ...off, Passkeys: 1, HasSecondFactor: true })
    passkey.get.mockResolvedValueOnce({ id: "cred" })
    post.mockResolvedValueOnce({ CeremonyID: "c1", Options: { publicKey: {} } })
    post.mockResolvedValueOnce({ Method: "passkey", At: "", ExpiresAt: "" })
    await submit()
    expect(post).toHaveBeenNthCalledWith(1, "/api/auth/step-up/passkey/begin", {})
    expect(post).toHaveBeenNthCalledWith(2, "/api/auth/step-up", { Method: "passkey", CeremonyID: "c1", Credential: { id: "cred" } })
    expect(assign).toHaveBeenCalledWith(RETURN)
  })

  it("both factors: one choice of two, the code by default", async () => {
    passkey.supported = true
    await render({ ...off, TOTPEnabled: true, Passkeys: 1, HasSecondFactor: true })
    const radios = host.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    expect(radios).toHaveLength(2)
    expect(radios[0].checked).toBe(true)
    expect(button("Підтвердити")).toBeDefined()
  })
})
