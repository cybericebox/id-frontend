// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiGet } from "@/api/client"
import { resetClientTokenForTests } from "@/lib/clientToken"

const tokenOk = () => new Response(JSON.stringify({ Data: { ExpiresAt: new Date(Date.now() + 3_600_000).toISOString() } }), { status: 200 })
const json = (status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ Status: { Code: 0 }, Data: { a: 1 } }), { status, headers: { "content-type": "application/json", ...headers } })

describe("api client client-token flow", () => {
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

  const calls = () => fetchMock.mock.calls.map((c) => String(c[0]).replace(/^.*(?=\/api)/, ""))

  it("fetches the token before the first call", async () => {
    fetchMock.mockResolvedValueOnce(tokenOk()).mockResolvedValueOnce(json(200))
    await expect(apiGet("/api/x")).resolves.toEqual({ a: 1 })
    expect(calls()).toEqual(["/api/client-token", "/api/x"])
  })

  it("on X-Client-Token: required refreshes and retries once", async () => {
    localStorage.setItem("cib_client_token_expires", String(Date.now() + 3_600_000))
    fetchMock
      .mockResolvedValueOnce(json(429, { "X-Client-Token": "required" }))
      .mockResolvedValueOnce(tokenOk())
      .mockResolvedValueOnce(json(200))
    await expect(apiGet("/api/x")).resolves.toEqual({ a: 1 })
    expect(calls()).toEqual(["/api/x", "/api/client-token", "/api/x"])
  })

  it("does not retry a plain 429", async () => {
    localStorage.setItem("cib_client_token_expires", String(Date.now() + 3_600_000))
    fetchMock.mockResolvedValueOnce(json(429))
    await expect(apiGet("/api/x")).rejects.toMatchObject({ status: 429 })
    expect(calls()).toEqual(["/api/x"])
  })
})
