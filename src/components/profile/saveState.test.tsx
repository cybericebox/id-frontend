// @vitest-environment jsdom
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Account } from "./types"

const { patch, post } = vi.hoisted(() => ({ patch: vi.fn(), post: vi.fn() }))
vi.mock("@/api/client", async (orig) => ({
  ...(await orig<typeof import("@/api/client")>()), apiPatch: patch, apiPost: post,
  apiGet: vi.fn().mockResolvedValue({}),
}))
vi.mock("@/components/ui/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ApiError } from "@/api/client"
import { localizedError } from "@/i18n/apiError"
import { ProfileTab } from "./ProfileTab"
import { AccountTab } from "./AccountTab"
import { SecurityTab } from "./SecurityTab"
import { profileNameDraftKey } from "@/lib/storageKeys"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const account: Account = {
  ID: "u1", FirstName: "Olena", LastName: "Koval", Email: "olena@example.test", Picture: "",
  EmailConfirmed: true, Role: "user", Providers: [], HasPassword: true, CreatedAt: "",
}

describe("profile save actions", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  const render = async (ui: ReactNode) => { await act(async () => root.render(ui)) }
  // a busy-capable button holds two faces: match its idle label
  const action = (label: string) => Array.from(host.querySelectorAll("button")).find((button) => (button.querySelector(".ib-btn__face")?.textContent ?? button.textContent) === label)
  const input = (name: string) => host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
  const change = async (name: string, value: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(name), value)
      input(name).dispatchEvent(new Event("input", { bubbles: true }))
    })
  }
  const submit = async () => { await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))) }

  beforeEach(() => {
    vi.clearAllMocks()
    patch.mockResolvedValue(undefined)
    post.mockResolvedValue(undefined)
    sessionStorage.clear()
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  it("never restores the name draft another account left in this tab", async () => {
    sessionStorage.setItem(profileNameDraftKey("someone-else"), JSON.stringify({ FirstName: "Taras", LastName: "Shevchenko" }))
    await render(<ProfileTab account={account} onUpdated={vi.fn()} />)
    expect(input("FirstName").value).toBe("Olena")
    expect(action("Зберегти зміни")?.disabled).toBe(true)
  })

  it("disables visible unchanged profile Save and rejects a keyboard no-op", async () => {
    await render(<ProfileTab account={account} onUpdated={vi.fn()} />)
    expect(action("Зберегти зміни")?.disabled).toBe(true)
    await submit()
    expect(patch).not.toHaveBeenCalled()
    await change("FirstName", "Kateryna")
    expect(action("Зберегти зміни")?.disabled).toBe(false)
    await change("FirstName", "Olena")
    expect(action("Зберегти зміни")?.disabled).toBe(true)
  })

  it("advances only the acknowledged profile baseline and retains newer edits and their draft", async () => {
    let resolve: () => void = () => undefined
    patch.mockReturnValueOnce(new Promise<void>((done) => { resolve = done }))
    const onUpdated = vi.fn()
    await render(<ProfileTab account={account} onUpdated={onUpdated} />)
    await change("FirstName", "Kateryna")
    await submit()
    expect(patch).toHaveBeenCalledWith("/api/auth/account/profile", { FirstName: "Kateryna", LastName: "Koval" })
    expect(action("Зберегти зміни")?.disabled).toBe(true)
    expect(input("LastName").disabled).toBe(false)
    await change("LastName", "Bondar")
    await act(async () => resolve())
    expect(input("LastName").value).toBe("Bondar")
    expect(action("Зберегти зміни")?.disabled).toBe(false)
    expect(JSON.parse(sessionStorage.getItem(profileNameDraftKey(account.ID))!)).toEqual({ FirstName: "Kateryna", LastName: "Bondar" })
    await render(<ProfileTab account={{ ...account, FirstName: "Kateryna" }} onUpdated={onUpdated} />)
    expect(input("LastName").value).toBe("Bondar")
    await submit()
    expect(patch).toHaveBeenLastCalledWith("/api/auth/account/profile", { FirstName: "Kateryna", LastName: "Bondar" })
    expect(action("Зберегти зміни")?.disabled).toBe(true)
    expect(sessionStorage.getItem(profileNameDraftKey(account.ID))).toBeNull()
  })

  it("follows account refreshes only when the profile draft is clean", async () => {
    const onUpdated = vi.fn()
    await render(<ProfileTab account={account} onUpdated={onUpdated} />)
    await render(<ProfileTab account={{ ...account, FirstName: "Kateryna" }} onUpdated={onUpdated} />)
    expect(input("FirstName").value).toBe("Kateryna")
    expect(action("Зберегти зміни")?.disabled).toBe(true)
    await change("LastName", "Bondar")
    await render(<ProfileTab account={{ ...account, FirstName: "Kateryna", LastName: "Rudenko" }} onUpdated={onUpdated} />)
    expect(input("LastName").value).toBe("Bondar")
    await change("LastName", "Rudenko")
    expect(action("Зберегти зміни")?.disabled).toBe(true)
  })

  it("keeps a failed profile draft available for retry", async () => {
    patch.mockRejectedValueOnce(new Error("offline"))
    await render(<ProfileTab account={account} onUpdated={vi.fn()} />)
    await change("FirstName", "Kateryna")
    await submit()
    expect(input("FirstName").value).toBe("Kateryna")
    expect(action("Зберегти зміни")?.disabled).toBe(false)
    await submit()
    expect(patch).toHaveBeenCalledTimes(2)
    expect(action("Зберегти зміни")?.disabled).toBe(true)
  })

  it("compares email to the normalized account address and guards a no-change submit", async () => {
    await render(<AccountTab account={account} />)
    await change("Email", " OLENA@EXAMPLE.TEST ")
    await change("CurrentPassword", "Password1")
    expect(action("Змінити пошту")?.disabled).toBe(true)
    await submit()
    expect(post).not.toHaveBeenCalled()
    await change("Email", " NEW@EXAMPLE.TEST ")
    expect(action("Змінити пошту")?.disabled).toBe(false)
    await submit()
    expect(post).toHaveBeenCalledWith("/api/auth/account/email", { Email: "new@example.test", CurrentPassword: "Password1" })
    expect(action("Змінити пошту")?.disabled).toBe(true)
  })

  it("does not erase a newer email request after an older request succeeds", async () => {
    let resolve: () => void = () => undefined
    post.mockReturnValueOnce(new Promise<void>((done) => { resolve = done }))
    await render(<AccountTab account={account} />)
    await change("Email", "first@example.test")
    await change("CurrentPassword", "Password1")
    await submit()
    await change("Email", "second@example.test")
    await act(async () => resolve())
    expect(input("Email").value).toBe("second@example.test")
    expect(action("Змінити пошту")?.disabled).toBe(false)
  })

  it("keeps password Save visible and enables it for a valid new password operation", async () => {
    await render(<SecurityTab account={account} />)
    expect(action("Зберегти пароль")?.disabled).toBe(true)
    await change("OldPassword", "OldPassword1")
    expect(action("Зберегти пароль")?.disabled).toBe(true)
    await change("NewPassword", "NewPassword1")
    expect(action("Зберегти пароль")?.disabled).toBe(true)
    await change("ConfirmPassword", "NewPassword1")
    expect(action("Зберегти пароль")?.disabled).toBe(false)
    await submit()
    expect(post).toHaveBeenCalledWith("/api/auth/password/change", { OldPassword: "OldPassword1", NewPassword: "NewPassword1" })
    expect(action("Зберегти пароль")?.disabled).toBe(true)
  })

  it.each([[20410, "OldPassword"], [20409, "NewPassword"]])("places backend password error %s beside %s", async (code, name) => {
    const error = new ApiError(400, null, undefined, undefined, code)
    post.mockRejectedValueOnce(error)
    await render(<SecurityTab account={account} />)
    await change("OldPassword", "OldPassword1")
    await change("NewPassword", "NewPassword1")
    await change("ConfirmPassword", "NewPassword1")
    await submit()
    const control = input(String(name))
    expect(control.getAttribute("aria-invalid")).toBe("true")
    const message = document.getElementById(control.getAttribute("aria-describedby")!)
    expect(message?.textContent).toBe(localizedError(error))
    expect(control.closest(".space-y-2")?.contains(message)).toBe(true)
    expect(message?.classList.contains("hidden")).toBe(false)
    expect(host.querySelector('[data-slot="alert"]')).toBeNull()
  })

  it("puts a claimed email error at the email and keeps the draft", async () => {
    const error = new ApiError(400, null, undefined, undefined, 20302)
    post.mockRejectedValueOnce(error)
    await render(<AccountTab account={account} />)
    await change("Email", "taken@example.test")
    await change("CurrentPassword", "Password1")
    await submit()
    const control = input("Email")
    expect(control.getAttribute("aria-invalid")).toBe("true")
    expect(document.getElementById(control.getAttribute("aria-describedby")!)?.textContent).toBe(localizedError(error))
    expect(control.value).toBe("taken@example.test")
    expect(input("CurrentPassword").getAttribute("aria-invalid")).toBe("false")
  })

  it("places an invalid profile photo error alongside its picker", async () => {
    await render(<ProfileTab account={account} onUpdated={vi.fn()} />)
    const picker = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(picker, "files", { configurable: true, value: [new File(["data"], "wrong.txt", { type: "text/plain" })] })
    await act(async () => picker.dispatchEvent(new Event("change", { bubbles: true })))
    const message = document.getElementById(picker.getAttribute("aria-describedby")!)
    expect(picker.getAttribute("aria-invalid")).toBe("true")
    expect(picker.parentElement?.contains(message)).toBe(true)
    expect(host.querySelector("form")?.contains(message)).toBe(false)
  })

})
