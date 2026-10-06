// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const probe = vi.hoisted(() => vi.fn<() => Promise<boolean>>())
vi.mock("@/lib/serviceStatus", async (orig) => ({ ...(await orig<typeof import("@/lib/serviceStatus")>()), probeService: probe }))
vi.mock("@/lib/origins", () => ({ apiOrigin: "http://api", mainOrigin: "http://main" }))

import { ServiceStatusGate } from "./ServiceStatusGate"
import { confirmServiceUnavailable, getServiceStatus, reportServiceAvailable, reportServiceUnavailable } from "@/lib/serviceStatus"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("ServiceStatusGate", () => {
  let page: HTMLElement
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.useFakeTimers()
    probe.mockReset()
    page = document.body.appendChild(document.createElement("div"))
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    reportServiceAvailable()
    page.remove()
    host.remove()
    vi.useRealTimers()
  })

  const show = () => {
    act(() => root.render(<ServiceStatusGate />))
    act(() => { reportServiceUnavailable(); confirmServiceUnavailable() })
  }

  it("shows nothing while the service is up", () => {
    act(() => root.render(<ServiceStatusGate />))
    expect(host.querySelector(".ib-service-down")).toBeNull()
  })

  it("shows the card, dims the page behind it and counts down", () => {
    show()
    expect(host.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(host.textContent).toContain("Сервер тимчасово недоступний")
    expect(host.textContent).toContain("Наступна спроба через 3 с")
    expect(page.hasAttribute("inert")).toBe(true)
    expect(page.classList.contains("ib-service-down-behind")).toBe(true)
    probe.mockResolvedValue(false)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(host.textContent).toContain("Наступна спроба через 2 с")
  })

  it("retries when the countdown ends and closes on success", async () => {
    show()
    probe.mockResolvedValue(true)
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(probe).toHaveBeenCalledTimes(1)
    expect(getServiceStatus()).toBe("up")
    expect(host.querySelector(".ib-service-down")).toBeNull()
    expect(page.hasAttribute("inert")).toBe(false)
  })

  it("«Спробувати зараз» retries at once; a failed try restarts the countdown, Esc does nothing", async () => {
    show()
    probe.mockResolvedValue(false)
    const esc = new KeyboardEvent("keydown", { key: "Escape", cancelable: true })
    document.dispatchEvent(esc)
    expect(esc.defaultPrevented).toBe(true)
    await act(async () => { host.querySelector("button")!.click() })
    expect(probe).toHaveBeenCalledTimes(1)
    expect(host.querySelector(".ib-service-down")).not.toBeNull()
    expect(host.textContent).toContain("Наступна спроба через 5 с")
  })
})
