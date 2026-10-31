// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { createPasskey, getPasskey, isPasskeyDismissed, passkeysSupported } from "./passkey"

afterEach(() => vi.unstubAllGlobals())

describe("passkey helpers", () => {
  it("is unsupported without the JSON API", () => {
    expect(passkeysSupported()).toBe(false)
  })

  it("treats a closed prompt and an aborted ceremony as dismissed, other errors not", () => {
    expect(isPasskeyDismissed(new DOMException("x", "NotAllowedError"))).toBe(true)
    expect(isPasskeyDismissed(new DOMException("x", "AbortError"))).toBe(true)
    expect(isPasskeyDismissed(new DOMException("x", "SecurityError"))).toBe(false)
    expect(isPasskeyDismissed(new Error("boom"))).toBe(false)
  })

  it("creates and gets through the JSON API and returns toJSON()", async () => {
    const created = { toJSON: () => ({ id: "new" }) }
    const got = { toJSON: () => ({ id: "got" }) }
    const create = vi.fn().mockResolvedValue(created)
    const get = vi.fn().mockResolvedValue(got)
    vi.stubGlobal("PublicKeyCredential", {
      parseCreationOptionsFromJSON: (json: unknown) => ({ parsed: "create", json }),
      parseRequestOptionsFromJSON: (json: unknown) => ({ parsed: "get", json }),
    })
    Object.defineProperty(navigator, "credentials", { value: { create, get }, configurable: true })
    expect(passkeysSupported()).toBe(true)
    expect(await createPasskey({ publicKey: { a: 1 } })).toEqual({ id: "new" })
    expect(create).toHaveBeenCalledWith({ publicKey: { parsed: "create", json: { a: 1 } } })
    expect(await getPasskey({ publicKey: { b: 2 } }, { conditional: true })).toEqual({ id: "got" })
    expect(get).toHaveBeenCalledWith(expect.objectContaining({ mediation: "conditional", publicKey: { parsed: "get", json: { b: 2 } } }))
  })

  it("a prompt that returns nothing is a dismissal", async () => {
    vi.stubGlobal("PublicKeyCredential", { parseCreationOptionsFromJSON: () => ({}), parseRequestOptionsFromJSON: () => ({}) })
    Object.defineProperty(navigator, "credentials", { value: { create: vi.fn().mockResolvedValue(null), get: vi.fn() }, configurable: true })
    await expect(createPasskey({ publicKey: {} })).rejects.toSatisfy(isPasskeyDismissed)
  })
})
