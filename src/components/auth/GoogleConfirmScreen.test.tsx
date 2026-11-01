// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const confirmPassword = vi.hoisted(() => vi.fn())
const sendCode = vi.hoisted(() => vi.fn())
const pendingLink = vi.hoisted(() => vi.fn())
vi.mock("@/api/googleConfirm", () => ({ getPendingGoogleLink: pendingLink, confirmGoogleWithPassword: confirmPassword, sendGoogleConfirmCode: sendCode, confirmGoogleWithCode: vi.fn() }))
const search = vi.hoisted(() => ({ value: "" }))
vi.mock("@/lib/useUrlParams", () => ({ useUrlParams: () => new URLSearchParams(search.value) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/google-confirm/", useRouter: () => ({ replace: vi.fn() }) }))

import { ApiError } from "@/api/client"
import { GoogleConfirmScreen } from "./GoogleConfirmScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("GoogleConfirmScreen", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    vi.clearAllMocks()
    pendingLink.mockResolvedValue({ GoogleEmail: "o@corp.example", GoogleName: "Олена", HasPassword: true })
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>("button"))

  it("a wrong password shows beside the password field, not at the end of the form", async () => {
    confirmPassword.mockRejectedValue(new ApiError(401, {}, undefined, undefined, 20410))
    await act(async () => { root.render(<GoogleConfirmScreen />) })
    const input = host.querySelector<HTMLInputElement>("#google-confirm-password")!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "x")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await act(async () => { buttons().find((b) => b.type === "submit")!.click() })
    expect(confirmPassword).toHaveBeenCalledWith("x")
    expect(input.getAttribute("aria-invalid")).toBe("true")
    expect(host.querySelector("#google-confirm-password-error")).not.toBeNull()
  })

  it("shows which Google account will be linked before the form", async () => {
    await act(async () => { root.render(<GoogleConfirmScreen />) })
    expect(host.textContent).toContain("Олена · o@corp.example")
  })

  it("without a pending link it says the link is not valid", async () => {
    pendingLink.mockRejectedValue(new ApiError(404, {}))
    await act(async () => { root.render(<GoogleConfirmScreen />) })
    expect(host.querySelector("form")).toBeNull()
  })

  it("an account without a password sees only the code path", async () => {
    pendingLink.mockResolvedValue({ GoogleEmail: "o@corp.example", GoogleName: "", HasPassword: false })
    await act(async () => { root.render(<GoogleConfirmScreen />) })
    expect(host.querySelector("#google-confirm-password")).toBeNull()
    expect(host.querySelector("#google-confirm-code")).not.toBeNull()
  })

  it("«Надіслати код на пошту» sends the mail and starts the 60 s countdown", async () => {
    sendCode.mockResolvedValue(undefined)
    await act(async () => { root.render(<GoogleConfirmScreen />) })
    await act(async () => { buttons().find((b) => b.textContent?.includes("код на пошту"))!.click() })
    expect(sendCode).toHaveBeenCalled()
    expect(buttons().some((b) => b.disabled && b.textContent?.includes("60"))).toBe(true)
  })
})
