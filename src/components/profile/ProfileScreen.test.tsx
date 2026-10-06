// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const get = vi.hoisted(() => vi.fn())
vi.mock("@/api/client", async (orig) => ({ ...(await orig<typeof import("@/api/client")>()), apiGet: get }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

import { ApiError } from "@/api/client"
import { ProfileScreen } from "./ProfileScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("ProfileScreen session check", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    get.mockReset()
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  const render = async () => {
    await act(async () => { root.render(<ProfileScreen />) })
  }

  it("5xx on the session check shows the 500 page with the reference and a retry", async () => {
    get.mockRejectedValue(new ApiError(503, null, undefined, undefined, 50310, undefined, "0123abcd-0000-0000-0000-000000000000"))
    await render()
    expect(host.querySelector(".ib-error--page")).not.toBeNull()
    expect(host.textContent).toContain("500")
    expect(host.textContent).toContain("50310-0123abcd")

    get.mockRejectedValue(new ApiError(503, null))
    const retry = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Спробувати ще раз")
    expect(retry).toBeDefined()
    await act(async () => { retry!.click() })
    expect(get).toHaveBeenCalledTimes(2)
  })

  it("a network failure shows the 500 page too", async () => {
    get.mockRejectedValue(new TypeError("Failed to fetch"))
    await render()
    expect(host.querySelector(".ib-error--page")).not.toBeNull()
  })

  it("a pending check shows the loader, not the error page", async () => {
    get.mockReturnValue(new Promise(() => {}))
    await render()
    expect(host.querySelector(".ib-error")).toBeNull()
  })
})
