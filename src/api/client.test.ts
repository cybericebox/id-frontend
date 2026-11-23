// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { apiGet, ApiError } from "./client"
import { reportServiceAvailable } from "@/lib/serviceStatus"

describe("api client session check", () => {
  const replace = vi.fn()
  beforeEach(() => {
    replace.mockReset()
    vi.stubGlobal("location", { ...window.location, replace, origin: "http://localhost", href: "http://localhost/profile/" })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    reportServiceAvailable()
  })

  it("401 redirects to sign-in and never settles", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401, headers: { "X-Sign-In-URL": "https://id.test/sign-in/" } })))
    const settled = vi.fn()
    void apiGet("/api/auth/account").then(settled, settled)
    await new Promise((r) => setTimeout(r, 20))
    expect(replace).toHaveBeenCalledWith("https://id.test/sign-in/")
    expect(settled).not.toHaveBeenCalled()
  })

  it("a 401 asking for a step-up is no dead session: it rejects with the code, nothing redirects", async () => {
    const body = JSON.stringify({ Status: { Code: 53801, Message: "Confirm it is you to continue" } })
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status: 401, headers: { "content-type": "application/json" } })))
    const err = await apiGet("/api/auth/recovery-codes").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe(53801)
    expect(replace).not.toHaveBeenCalled()
  })

  it("a 401 with another code still goes to sign-in and writes the return-to cookie", async () => {
    document.cookie = "cib_return_to=; path=/; max-age=0"
    const body = JSON.stringify({ Status: { Code: 20401, Message: "Unauthenticated" } })
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status: 401, headers: { "content-type": "application/json", "X-Sign-In-URL": "https://id.test/sign-in/" } })))
    const settled = vi.fn()
    void apiGet("/api/auth/account").then(settled, settled)
    await new Promise((r) => setTimeout(r, 20))
    expect(replace).toHaveBeenCalledWith("https://id.test/sign-in/")
    expect(settled).not.toHaveBeenCalled()
    expect(document.cookie).toContain("cib_return_to=")
  })

  it("a 401 with a plain-text body still goes to sign-in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Unauthorized", { status: 401, headers: { "content-type": "text/plain" } })))
    const settled = vi.fn()
    void apiGet("/api/auth/account").then(settled, settled)
    await new Promise((r) => setTimeout(r, 20))
    expect(replace).toHaveBeenCalledTimes(1)
    expect(settled).not.toHaveBeenCalled()
  })

  it("5xx rejects with ApiError carrying the request id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503, headers: { "X-Request-ID": "abc-123" } })))
    const err = await apiGet("/api/auth/account").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(503)
    expect((err as ApiError).requestId).toBe("abc-123")
    expect(replace).not.toHaveBeenCalled()
  })
})
