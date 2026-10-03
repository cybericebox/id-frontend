import { afterEach, describe, expect, it, vi } from "vitest"
import { startGoogleLink } from "./googleLink"

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
  )

afterEach(() => vi.restoreAllMocks())

describe("startGoogleLink", () => {
  it("posts the password and returns the consent URL", async () => {
    const spy = respond(200, { Status: { Code: 0 }, Data: { Url: "https://accounts.google.com/o/oauth2" } })
    await expect(startGoogleLink("Secret!1")).resolves.toBe("https://accounts.google.com/o/oauth2")
    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toContain("/api/auth/google/link")
    expect(init?.method).toBe("POST")
    expect(init?.body).toBe(JSON.stringify({ CurrentPassword: "Secret!1" }))
  })

  it("posts no body for an account without a password", async () => {
    const spy = respond(200, { Status: { Code: 0 }, Data: { Url: "https://g.example/x" } })
    await startGoogleLink()
    expect(spy.mock.calls[0][1]?.body).toBeUndefined()
  })

  it("rejects with the API error when the owner is not confirmed", async () => {
    respond(400, { Status: { Code: 60429, Message: "Sign in again" } })
    await expect(startGoogleLink()).rejects.toMatchObject({ status: 400 })
  })
})
