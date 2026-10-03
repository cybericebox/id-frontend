// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ensureClientToken, needsClientToken, resetClientTokenForTests } from "@/lib/clientToken"

const future = () => new Date(Date.now() + 3_600_000).toISOString()
const ok = () => new Response(JSON.stringify({ Data: { ExpiresAt: future() } }), { status: 200 })

describe("ensureClientToken", () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    resetClientTokenForTests()
    localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("NEXT_PUBLIC_DOS_PROTECTION", "on")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("does nothing when DoS protection is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_DOS_PROTECTION", "off")
    await ensureClientToken()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("posts the token once for parallel calls, with credentials and the none token", async () => {
    fetchMock.mockResolvedValue(ok())
    await Promise.all([ensureClientToken(), ensureClientToken(), ensureClientToken()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/client-token$/)
    expect(init.credentials).toBe("include")
    expect(JSON.parse(init.body)).toEqual({ RecaptchaToken: "none" })
    await ensureClientToken()
    expect(fetchMock).toHaveBeenCalledTimes(1) // still valid
  })

  it("refreshes when the stored expiry is inside the 1 minute margin", async () => {
    localStorage.setItem("cib_client_token_expires", String(Date.now() + 30_000))
    fetchMock.mockResolvedValue(ok())
    await ensureClientToken()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("force refreshes even when valid", async () => {
    fetchMock.mockResolvedValue(ok())
    await ensureClientToken()
    await ensureClientToken({ force: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("404 means the backend has DoS off: remembered, no more requests", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }))
    await ensureClientToken()
    await ensureClientToken({ force: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("429 backs off instead of looping", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "30" } }))
    await ensureClientToken()
    await ensureClientToken()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("a network failure does not throw", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"))
    await expect(ensureClientToken()).resolves.toBeUndefined()
  })

  it("needsClientToken only for 429 with X-Client-Token: required", () => {
    expect(needsClientToken(new Response("", { status: 429, headers: { "X-Client-Token": "required" } }))).toBe(true)
    expect(needsClientToken(new Response("", { status: 429 }))).toBe(false)
    expect(needsClientToken(new Response("", { status: 401, headers: { "X-Client-Token": "required" } }))).toBe(false)
  })
})
