import { afterEach, describe, expect, it, vi } from "vitest"
import { apiGet } from "@/api/client"
import { getServiceStatus, isNetworkOutage, probeService, reportServiceAvailable, reportServiceUnavailable, startOutageGrace } from "./serviceStatus"

afterEach(() => {
  vi.unstubAllGlobals()
  reportServiceAvailable()
})

describe("outage detection", () => {
  it("counts a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    await expect(apiGet("/api/auth/me", undefined, { required: false })).rejects.toBeInstanceOf(TypeError)
    expect(getServiceStatus()).toBe("suspect")
  })

  it.each([500, 502, 503, 504])("counts HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })))
    await expect(apiGet("/api/x", undefined, { required: false })).rejects.toThrow()
    expect(getServiceStatus()).toBe("suspect")
    reportServiceAvailable()
  })

  it.each([400, 401, 403, 404, 429])("does not count HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status })))
    await expect(apiGet("/api/x", undefined, { required: false })).rejects.toThrow()
    expect(getServiceStatus()).toBe("up")
  })

  it("does not count an aborted or timed-out request", async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")))
    await expect(apiGet("/api/x", { signal: controller.signal }, { required: false })).rejects.toThrow()
    expect(isNetworkOutage(new DOMException("timeout", "TimeoutError"))).toBe(false)
    expect(getServiceStatus()).toBe("up")
  })
})

describe("probeService", () => {
  it("asks /api/auth/me on the API origin and takes any answer below 500 as recovery", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("", { status: 403 }))
    vi.stubGlobal("fetch", fetch)
    await expect(probeService("https://api.test")).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledWith("https://api.test/api/auth/me", expect.objectContaining({ credentials: "include" }))
    fetch.mockResolvedValue(new Response("", { status: 401 }))
    await expect(probeService("https://api.test")).resolves.toBe(true)
  })

  it("fails on a 5xx or a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })))
    await expect(probeService("https://api.test")).resolves.toBe(false)
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    await expect(probeService("https://api.test")).resolves.toBe(false)
  })
})

describe("startOutageGrace", () => {
  afterEach(() => { vi.useRealTimers() })

  it("confirms the outage only after two failed probes, 30 s after the first failure", async () => {
    vi.useFakeTimers()
    const probe = vi.fn().mockResolvedValue(false)
    reportServiceUnavailable()
    startOutageGrace(probe)
    await vi.advanceTimersByTimeAsync(14_999)
    expect(probe).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(getServiceStatus()).toBe("suspect")
    await vi.advanceTimersByTimeAsync(14_999)
    expect(getServiceStatus()).toBe("suspect")
    await vi.advanceTimersByTimeAsync(1)
    expect(probe).toHaveBeenCalledTimes(2)
    expect(getServiceStatus()).toBe("down")
  })

  it("resets when the API is back before the first probe (10 s)", async () => {
    vi.useFakeTimers()
    const probe = vi.fn().mockResolvedValue(true)
    reportServiceUnavailable()
    startOutageGrace(probe)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(getServiceStatus()).toBe("up")
  })

  it("resets when the first probe fails and the second succeeds (20 s)", async () => {
    vi.useFakeTimers()
    const probe = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true)
    reportServiceUnavailable()
    startOutageGrace(probe)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(probe).toHaveBeenCalledTimes(2)
    expect(getServiceStatus()).toBe("up")
  })

  it("stops probing once cancelled", async () => {
    vi.useFakeTimers()
    const probe = vi.fn().mockResolvedValue(false)
    reportServiceUnavailable()
    startOutageGrace(probe)()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(probe).not.toHaveBeenCalled()
    expect(getServiceStatus()).toBe("suspect")
  })
})
