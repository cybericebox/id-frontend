// @vitest-environment jsdom
// The request shapes of the second-factor calls against the real api client (fetch stubbed), and how a 401 travels:
// a dead session goes to sign-in, a step-up request reaches the caller, a failed recovery sign-in stays on the form.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getPasskey = vi.hoisted(() => vi.fn())
vi.mock("@/lib/passkey", async (orig) => ({ ...(await orig<typeof import("@/lib/passkey")>()), getPasskey }))

import { ApiError } from "./client"
import {
  beginTotp,
  finishTotp,
  regenerateRecoveryCodes,
  removeTotp,
  signInWithRecoveryCode,
  stepUp,
} from "./secondFactor"
import { reportServiceAvailable } from "@/lib/serviceStatus"

type Call = { url: string; method: string; body: unknown }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ Status: { Code: status === 200 ? 0 : (data as { code: number }).code }, Data: status === 200 ? data : undefined }), {
    status,
    headers: { "content-type": "application/json" },
  })

describe("second-factor calls", () => {
  const replace = vi.fn()
  let calls: Call[]
  let answers: Response[]
  beforeEach(() => {
    replace.mockReset()
    getPasskey.mockReset()
    calls = []
    answers = []
    vi.stubGlobal("location", { ...window.location, replace, origin: "https://id.cybericebox.local", href: "https://id.cybericebox.local/profile/" })
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : undefined })
      return answers.shift() ?? json(null)
    }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    reportServiceAvailable()
  })
  const path = (c: Call) => new URL(c.url).pathname

  it("begin sends the current password only when there is one", async () => {
    answers.push(json({ Secret: "S", URI: "otpauth://x" }), json({ Secret: "S", URI: "otpauth://x" }))
    expect(await beginTotp("pw")).toEqual({ Secret: "S", URI: "otpauth://x" })
    await beginTotp()
    expect(calls.map((c) => [c.method, path(c), c.body])).toEqual([
      ["POST", "/api/auth/totp/begin", { CurrentPassword: "pw" }],
      ["POST", "/api/auth/totp/begin", {}],
    ])
  })

  it("finish and new codes read RecoveryCodes, null as none", async () => {
    answers.push(json({ RecoveryCodes: ["A", "B"] }), json({ RecoveryCodes: null }), json({ RecoveryCodes: null }))
    expect(await finishTotp("123456")).toEqual(["A", "B"])
    expect(await finishTotp("123456")).toEqual([])
    expect(await regenerateRecoveryCodes()).toEqual([])
    expect(calls.map((c) => [c.method, path(c), c.body])).toEqual([
      ["POST", "/api/auth/totp/finish", { Code: "123456" }],
      ["POST", "/api/auth/totp/finish", { Code: "123456" }],
      ["POST", "/api/auth/recovery-codes", {}],
    ])
  })

  it("remove is a DELETE without a body", async () => {
    await removeTotp()
    expect(calls).toEqual([{ url: expect.stringMatching(/\/api\/auth\/totp$/), method: "DELETE", body: undefined }])
  })

  it("step-up bodies: Method with Code, Password, or the passkey CeremonyID and Credential", async () => {
    getPasskey.mockResolvedValueOnce({ id: "cred", response: {} })
    answers.push(json(null), json(null), json({ CeremonyID: "c1", Options: { publicKey: { challenge: "x" } } }), json(null))
    await stepUp("totp", { code: "123456" })
    await stepUp("password", { password: "pw" })
    await stepUp("passkey")
    expect(getPasskey).toHaveBeenCalledWith({ publicKey: { challenge: "x" } })
    expect(calls.map((c) => [path(c), c.body])).toEqual([
      ["/api/auth/step-up", { Method: "totp", Code: "123456" }],
      ["/api/auth/step-up", { Method: "password", Password: "pw" }],
      ["/api/auth/step-up/passkey/begin", {}],
      ["/api/auth/step-up", { Method: "passkey", CeremonyID: "c1", Credential: { id: "cred", response: {} } }],
    ])
  })

  it.each([
    ["begin", () => beginTotp("pw")],
    ["finish", () => finishTotp("123456")],
    ["remove", () => removeTotp()],
    ["new codes", () => regenerateRecoveryCodes()],
    ["step-up", () => stepUp("totp", { code: "123456" })],
    ["passkey step-up", () => stepUp("passkey")],
  ])("%s: a dead session (401) goes to sign-in and never settles", async (_name, call) => {
    answers.push(new Response("", { status: 401, headers: { "X-Sign-In-URL": "https://id.cybericebox.local/sign-in/" } }))
    const settled = vi.fn()
    void call().then(settled, settled)
    await new Promise((r) => setTimeout(r, 20))
    expect(replace).toHaveBeenCalledWith("https://id.cybericebox.local/sign-in/")
    expect(settled).not.toHaveBeenCalled()
  })

  it("a step-up request (401 STEP_UP_REQUIRED) reaches the caller", async () => {
    answers.push(json({ code: 53801 }, 401))
    const err = await removeTotp().catch((e: unknown) => e)
    expect((err as ApiError).code).toBe(53801)
    expect(replace).not.toHaveBeenCalled()
  })

  it("a failed recovery sign-in (401) stays on the form", async () => {
    answers.push(json({ code: 53807 }, 401))
    const err = await signInWithRecoveryCode({ Email: "a@b.c", Password: "pw", Code: "AAAA-BBBB-CCCC", RecaptchaToken: "none" }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe(53807)
    expect(replace).not.toHaveBeenCalled()
    expect(calls[0].body).toEqual({ Email: "a@b.c", Password: "pw", Code: "AAAA-BBBB-CCCC", RecaptchaToken: "none" })
  })
})
