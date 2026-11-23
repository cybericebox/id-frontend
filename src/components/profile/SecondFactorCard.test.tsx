// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.hoisted(() => vi.fn())
const post = vi.hoisted(() => vi.fn())
const del = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiGet: get, apiPost: post, apiDelete: del }))
const passkey = vi.hoisted(() => ({ supported: false, get: vi.fn() }))
vi.mock("@/lib/passkey", async (orig) => ({
  ...(await orig<typeof import("@/lib/passkey")>()),
  passkeysSupported: () => passkey.supported,
  getPasskey: passkey.get,
}))

import { ApiError } from "@/api/client"
import type { SecondFactorStatus } from "@/api/secondFactor"
import type { Account } from "./types"
import { SecondFactorCard } from "./SecondFactorCard"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const account: Account = {
  ID: "u1", FirstName: "Olena", LastName: "K", Email: "olena@example.com", Picture: "", EmailConfirmed: true,
  Role: "user", Providers: [], HasPassword: true, CreatedAt: "2026-01-01T00:00:00Z",
}
const off: SecondFactorStatus = {
  TOTPEnabled: false, TOTPConfirmedAt: null, Passkeys: 0, RecoveryCodesLeft: 0, HasSecondFactor: false,
  StepUpMethod: null, StepUpExpiresAt: null,
}
const on: SecondFactorStatus = { ...off, TOTPEnabled: true, TOTPConfirmedAt: "2026-11-20T10:00:00Z", HasSecondFactor: true, RecoveryCodesLeft: 10 }
const CODES = Array.from({ length: 10 }, (_, i) => `AAAA-BBBB-${String(i).padStart(4, "0")}`)
const URI = "otpauth://totp/Cyber%20ICE%20Box:olena%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Cyber%20ICE%20Box"

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe("SecondFactorCard", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    vi.clearAllMocks()
    passkey.supported = false
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    document.body.innerHTML = ""
  })

  const body = () => document.body
  // a busy-capable button holds its idle and busy faces; the idle face is its label
  const label = (b: Element) => (b.querySelector(".ib-btn__face") ?? b).textContent?.trim()
  const button = (text: string) => Array.from(body().querySelectorAll("button")).find((b) => label(b) === text)
  const input = (id: string) => body().querySelector<HTMLInputElement>(`#${id}`)!
  const type = async (el: HTMLInputElement, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    })
  }
  const click = async (el: Element | undefined) => {
    expect(el).toBeDefined()
    await act(async () => { (el as HTMLElement).click() })
  }
  const submit = async (el: Element | undefined) => {
    expect(el).toBeDefined()
    await act(async () => { (el as HTMLElement).closest("form")!.requestSubmit(el as HTMLElement) })
  }
  const render = async (status: SecondFactorStatus, acc: Account = account) => {
    get.mockResolvedValue(status)
    await act(async () => { root.render(<SecondFactorCard account={acc} />) })
  }

  it("shows the status from /second-factor", async () => {
    await render(on)
    expect(get).toHaveBeenCalledWith("/api/auth/second-factor")
    expect(host.textContent).toContain("Двоетапну перевірку ввімкнено")
    expect(host.textContent).toContain("Залишилося кодів: 10 з 10")
  })

  it("enrols: password, QR and the key, the first code, then the 10 codes once; the status turns on without a loader", async () => {
    await render(off)
    await click(button("Налаштувати"))
    await type(input("totp-start-password"), "secret-pass")
    post.mockResolvedValueOnce({ Secret: "JBSWY3DPEHPK3PXP", URI })
    await submit(button("Продовжити"))
    expect(post).toHaveBeenCalledWith("/api/auth/totp/begin", { CurrentPassword: "secret-pass" }, undefined, { required: false })
    expect(body().querySelector('svg[role="img"]')).not.toBeNull()
    expect(body().textContent).toContain("JBSW Y3DP EHPK 3PXP")

    post.mockResolvedValueOnce({ RecoveryCodes: CODES })
    await type(input("totp-code"), "123 456")
    expect(input("totp-code").value).toBe("123456")
    await submit(button("Підтвердити"))
    expect(post).toHaveBeenLastCalledWith("/api/auth/totp/finish", { Code: "123456" }, undefined, { required: false })

    const items = Array.from(body().querySelectorAll("ol li")).map((li) => li.textContent)
    expect(items).toEqual(CODES)
    const done = button("Готово")!
    expect(done.disabled).toBe(true)
    await click(body().querySelector<HTMLInputElement>("#recovery-codes-saved")!)
    expect(done.disabled).toBe(false)
    get.mockReturnValue(new Promise(() => {}))
    await click(done)
    expect(body().querySelector("ol")).toBeNull()
    expect(host.textContent).toContain("Двоетапну перевірку ввімкнено")
    expect(host.querySelector(".loading-area")).toBeNull()
  })

  it("a wrong first code stays beside the code field", async () => {
    await render(off)
    await click(button("Налаштувати"))
    await type(input("totp-start-password"), "secret-pass")
    post.mockResolvedValueOnce({ Secret: "JBSWY3DPEHPK3PXP", URI })
    await submit(button("Продовжити"))
    post.mockRejectedValueOnce(new ApiError(400, null, undefined, undefined, 23802))
    await type(input("totp-code"), "000000")
    await submit(button("Підтвердити"))
    const field = input("totp-code")
    expect(field.getAttribute("aria-invalid")).toBe("true")
    const describedBy = field.getAttribute("aria-describedby")!
    expect(body().querySelector(`#${describedBy}`)!.textContent).toBe("Неправильний код застосунку-автентифікатора")
  })

  it("a wrong password stays beside the password field", async () => {
    await render(off)
    await click(button("Налаштувати"))
    await type(input("totp-start-password"), "nope")
    post.mockRejectedValueOnce(new ApiError(400, null, undefined, undefined, 20410))
    await submit(button("Продовжити"))
    expect(input("totp-start-password").getAttribute("aria-invalid")).toBe("true")
    expect(body().querySelector("#totp-start-password-error")).not.toBeNull()
  })

  it("removal is a danger confirmation that steps up with a code first, then deletes", async () => {
    await render(on)
    await click(body().querySelector('button[aria-label="Видалити застосунок-автентифікатор"]')!)
    const confirm = button("Видалити")!
    expect(confirm.className).toContain("bg-danger")
    expect(document.activeElement && label(document.activeElement)).toBe("Скасувати")
    await type(input("totp-remove-code"), "654321")
    post.mockResolvedValueOnce({ Method: "totp", At: "", ExpiresAt: "" })
    del.mockResolvedValueOnce(undefined)
    get.mockReturnValue(new Promise(() => {}))
    await submit(confirm)
    expect(post).toHaveBeenCalledWith("/api/auth/step-up", { Method: "totp", Code: "654321" }, undefined, { required: false })
    expect(del).toHaveBeenCalledWith("/api/auth/totp", undefined, { required: false })
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0])
    expect(host.textContent).toContain("Двоетапну перевірку вимкнено")
  })

  it("a fresh factor step-up removes without asking for a code", async () => {
    await render({ ...on, StepUpMethod: "recovery-code", StepUpExpiresAt: new Date(Date.now() + 120_000).toISOString() })
    expect(host.textContent).toContain("Ви увійшли за кодом відновлення")
    await click(body().querySelector('button[aria-label="Видалити застосунок-автентифікатор"]')!)
    expect(body().querySelector("#totp-remove-code")).toBeNull()
    del.mockResolvedValueOnce(undefined)
    get.mockReturnValue(new Promise(() => {}))
    await submit(button("Видалити"))
    expect(post).not.toHaveBeenCalled()
    expect(del).toHaveBeenCalledTimes(1)
  })

  it("the last factor of a key holder: the refusal stays in the dialog", async () => {
    await render({ ...on, StepUpMethod: "totp", StepUpExpiresAt: new Date(Date.now() + 120_000).toISOString() })
    await click(body().querySelector('button[aria-label="Видалити застосунок-автентифікатор"]')!)
    del.mockRejectedValueOnce(new ApiError(400, null, undefined, undefined, 23806))
    await submit(button("Видалити"))
    expect(body().querySelector('[role="dialog"] [role="alert"]')!.textContent).toContain("Вашому доступу потрібен другий фактор")
  })

  it("a pending save keeps the other controls enabled", async () => {
    await render({ ...on, StepUpMethod: "totp", StepUpExpiresAt: new Date(Date.now() + 120_000).toISOString() })
    await click(button("Створити нові коди"))
    const pending = deferred<{ RecoveryCodes: string[] }>()
    post.mockReturnValueOnce(pending.promise)
    await submit(button("Замінити"))
    expect(body().querySelector('[role="dialog"] button[aria-busy="true"]')!.textContent).toContain("Замінюємо…")
    expect(host.querySelector<HTMLButtonElement>('button[aria-label="Видалити застосунок-автентифікатор"]')!.disabled).toBe(false)
    await act(async () => { pending.resolve({ RecoveryCodes: CODES }) })
    expect(Array.from(body().querySelectorAll("ol li"))).toHaveLength(10)
  })

  it("regenerating answers step-up required: the code field appears with the message", async () => {
    await render(on)
    await click(button("Створити нові коди"))
    await type(input("codes-regenerate-code"), "111111")
    post.mockResolvedValueOnce({ Method: "totp", At: "", ExpiresAt: "" })
    post.mockRejectedValueOnce(new ApiError(401, null, undefined, undefined, 53801))
    await submit(button("Замінити"))
    expect(body().querySelector('[role="dialog"] [role="alert"]')!.textContent).toContain("Підтвердьте, що це ви")
  })
})
