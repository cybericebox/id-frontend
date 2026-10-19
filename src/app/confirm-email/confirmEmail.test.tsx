// @vitest-environment jsdom
// The email change is confirmed by the owner's click, not on page load: a mail scanner that opens the link with JS
// must not confirm it first.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const post = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiPost: post }))
const replace = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ usePathname: () => "/confirm-email/", useRouter: () => ({ replace }) }))

import ConfirmEmailPage from "./page"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("/confirm-email", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    window.history.replaceState(null, "", "/confirm-email/?token=abc")
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    post.mockReset()
  })

  it("sends nothing on load and confirms on the button", async () => {
    post.mockResolvedValue(undefined)
    await act(async () => { root.render(<ConfirmEmailPage />) })
    expect(post).not.toHaveBeenCalled()
    // the token left the address
    expect(replace).toHaveBeenCalledWith("/confirm-email/", { scroll: false })
    const confirm = host.querySelector<HTMLButtonElement>("button")!
    expect(confirm.querySelector(".ib-btn__face:not([aria-hidden])")?.textContent).toBe("Підтвердити нову адресу")
    await act(async () => { confirm.click() })
    expect(post).toHaveBeenCalledWith("/api/auth/account/email/confirm", { Code: "abc" }, undefined, { required: false })
    expect(host.textContent).toContain("Адресу електронної пошти змінено")
  })
})
