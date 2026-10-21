// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PULSE_INTERVAL_MS, PULSE_MIN_GAP_MS, parsePulse, pulseDelay, pulseNow, scopeQuery, subscribePulse } from "./pulse"

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", () => ({ apiGet: api.get }))

const scope = { site: "id" }
let visibility: DocumentVisibilityState = "visible"
const pulses = () => api.get.mock.calls.length
const flush = (ms = 0) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => {
  vi.useFakeTimers()
  visibility = "visible"
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility })
  api.get.mockReset()
  api.get.mockResolvedValue({ Banners: "v1", Inbox: { Cursor: "c1", Unread: 2 } })
})
afterEach(() => vi.useRealTimers())

describe("pulse helpers", () => {
  it("keeps the delay within the interval ± 20 %", () => {
    expect(pulseDelay(0)).toBe(24_000)
    expect(pulseDelay(0.5)).toBe(PULSE_INTERVAL_MS)
    expect(pulseDelay(0.999999)).toBe(36_000)
  })
  it("builds the scope query and parses a pulse tolerantly", () => {
    expect(scopeQuery({ site: "id" })).toBe("?site=id")
    expect(scopeQuery({ site: "event", event: "e1" }, { since: "" })).toBe("?site=event&event=e1&since=")
    expect(parsePulse({ Banners: "v", Inbox: null })).toEqual({ Banners: "v", Inbox: null })
    expect(parsePulse({ Banners: "v", Inbox: { Cursor: "c", Unread: 3 } })?.Inbox).toEqual({ Cursor: "c", Unread: 3 })
    expect(parsePulse({})).toBeNull()
    expect(parsePulse(null)).toBeNull()
  })
})

describe("pulse loop", () => {
  it("pulses at once, then on the jittered interval, one loop for all subscribers", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const a = vi.fn()
    const b = vi.fn()
    const offA = subscribePulse(scope, a)
    const offB = subscribePulse(scope, b)
    await flush()
    expect(pulses()).toBe(1)
    expect(api.get).toHaveBeenCalledWith("/api/notifications/pulse?site=id", undefined, { required: false })
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    await flush(PULSE_INTERVAL_MS - 1)
    expect(pulses()).toBe(1)
    await flush(1)
    expect(pulses()).toBe(2)
    offA()
    offB()
    await flush(120_000)
    expect(pulses()).toBe(2)
    vi.restoreAllMocks()
  })

  it("replays the latest pulse to a late subscriber without another request", async () => {
    const off = subscribePulse(scope, vi.fn())
    await flush()
    const late = vi.fn()
    const offLate = subscribePulse(scope, late)
    await flush()
    expect(late).toHaveBeenCalledWith({ Banners: "v1", Inbox: { Cursor: "c1", Unread: 2 } })
    expect(pulses()).toBe(1)
    offLate()
    off()
  })

  it("pauses while hidden and pulses once when the tab is visible again, at most once per 5 s", async () => {
    const off = subscribePulse(scope, vi.fn())
    await flush()
    visibility = "hidden"
    document.dispatchEvent(new Event("visibilitychange"))
    await flush(120_000)
    expect(pulses()).toBe(1)
    visibility = "visible"
    document.dispatchEvent(new Event("visibilitychange"))
    window.dispatchEvent(new Event("focus"))
    window.dispatchEvent(new Event("online"))
    await flush()
    expect(pulses()).toBe(2)
    await flush(PULSE_MIN_GAP_MS - 100)
    window.dispatchEvent(new Event("focus"))
    await flush()
    expect(pulses()).toBe(2)
    await flush(200)
    window.dispatchEvent(new Event("focus"))
    await flush()
    expect(pulses()).toBe(3)
    off()
  })

  it("survives a failed pulse and pulseNow ignores the throttle", async () => {
    api.get.mockRejectedValueOnce(new Error("down"))
    const listener = vi.fn()
    const off = subscribePulse(scope, listener)
    await flush()
    expect(listener).not.toHaveBeenCalled()
    pulseNow(scope)
    await flush()
    expect(pulses()).toBe(2)
    expect(listener).toHaveBeenCalledTimes(1)
    await flush(40_000)
    expect(pulses()).toBe(3)
    off()
  })
})
