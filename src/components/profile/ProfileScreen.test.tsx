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
import { getServiceStatus, reportServiceAvailable } from "@/lib/serviceStatus"
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
    reportServiceAvailable()
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

    get.mockRejectedValue(new ApiError(503, null, undefined, undefined, 50310, undefined, "0123abcd-0000-0000-0000-000000000000"))
    const retry = Array.from(host.querySelectorAll("button")).find((b) => b.textContent === "Спробувати ще раз")
    expect(retry).toBeDefined()
    await act(async () => { retry!.click() })
    expect(get).toHaveBeenCalledTimes(2)
  })

  it.each([
    ["a network failure", () => new TypeError("Failed to fetch")],
    ["a proxy 502 without X-Request-ID", () => new ApiError(502, null)],
  ])("%s goes to the service gate: no 500 page, the loader stays", async (_name, make) => {
    get.mockRejectedValue(make())
    await render()
    expect(host.querySelector(".ib-error")).toBeNull()
    expect(getServiceStatus()).toBe("suspect")
  })

  it("the session check runs again when the gate sees the backend back", async () => {
    get.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await render()
    get.mockRejectedValue(new TypeError("still down"))
    await act(async () => { reportServiceAvailable() })
    expect(get).toHaveBeenCalledTimes(2)
  })

  it("a pending check shows the loader, not the error page", async () => {
    get.mockReturnValue(new Promise(() => {}))
    await render()
    expect(host.querySelector(".ib-error")).toBeNull()
  })
})
