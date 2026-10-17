import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiGet, apiPost, ApiError } from "./client"
import { isOverloadError } from "./retry"
import { isServiceDown, reportServiceAvailable, subscribeServiceStatus } from "@/lib/serviceStatus"

const busy = () => new Response("", { status: 503, headers: { "Retry-After": "1" } })
const ok = () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } })

beforeEach(() => { vi.useFakeTimers(); vi.spyOn(Math, "random").mockReturnValue(0) })
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  reportServiceAvailable()
})

describe("overload retry in the API client", () => {
  it("does not report an outage on a 503 that a retry recovers from", async () => {
    const reports = vi.fn()
    const unsubscribe = subscribeServiceStatus(reports)
    let call = 0
    const fetchMock = vi.fn(async () => (call++ === 0 ? busy() : ok()))
    vi.stubGlobal("fetch", fetchMock)
    const result = apiGet("/api/x", undefined, { required: false })
    await vi.runAllTimersAsync()
    await expect(result).resolves.toBeUndefined()
    unsubscribe()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(reports).not.toHaveBeenCalled()
    expect(isServiceDown()).toBe(false)
  })

  it("reports the outage only on the final 503, after the retries", async () => {
    const reports = vi.fn()
    const unsubscribe = subscribeServiceStatus(reports)
    const fetchMock = vi.fn(async () => busy())
    vi.stubGlobal("fetch", fetchMock)
    const result = apiGet("/api/x", undefined, { required: false }).catch((e: unknown) => e)
    await vi.runAllTimersAsync()
    expect(await result).toBeInstanceOf(ApiError)
    unsubscribe()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(reports).toHaveBeenCalledTimes(1)
  })

  it("does not repeat a GET 503 without Retry-After and reports it at once", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 503 }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(apiGet("/api/x", undefined, { required: false })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(isServiceDown()).toBe(true) // reported at once
  })

  it("never repeats a mutation", async () => {
    const fetchMock = vi.fn(async () => busy())
    vi.stubGlobal("fetch", fetchMock)
    await expect(apiPost("/api/x", {})).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("retry: false returns the first answer", async () => {
    const fetchMock = vi.fn(async () => busy())
    vi.stubGlobal("fetch", fetchMock)
    await expect(apiGet("/api/x", undefined, { retry: false })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(["1", "0", "Sun, 18 Oct 2026 11:59:00 GMT"])("keeps Retry-After %s on the error as an overload error", async (header) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503, headers: { "Retry-After": header } })))
    const err = await apiPost("/api/x", {}).catch((e: unknown) => e)
    expect(isOverloadError(err)).toBe(true)
  })

  it("keeps Retry-After on any status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429, headers: { "Retry-After": "7" } })))
    const err = (await apiPost("/api/x", {}).catch((e: unknown) => e)) as ApiError
    expect(err.retryAfter).toBe(7)
  })
})
