import { describe, expect, it } from "vitest"

import type { SecondFactorStatus } from "@/api/secondFactor"
import { cleanTotpCode, confirmMethods, factorStepUpFresh, isRecoveryCode, normalizeRecoveryCode, recoveryCodesText } from "./stepUp"

const NOW = Date.parse("2026-11-23T12:00:00Z")
const status = (over: Partial<SecondFactorStatus> = {}): SecondFactorStatus => ({
  TOTPEnabled: false, TOTPConfirmedAt: null, Passkeys: 0, RecoveryCodesLeft: 0, HasSecondFactor: false,
  StepUpMethod: null, StepUpExpiresAt: null, ...over,
})
const later = new Date(NOW + 60_000).toISOString()
const earlier = new Date(NOW - 1_000).toISOString()

describe("factorStepUpFresh", () => {
  it.each(["totp", "passkey", "recovery-code"] as const)("a fresh %s step-up confirms a factor change", (m) => {
    expect(factorStepUpFresh(status({ StepUpMethod: m, StepUpExpiresAt: later }), NOW)).toBe(true)
  })
  it.each(["password", "recent-sign-in"] as const)("a %s step-up does not", (m) => {
    expect(factorStepUpFresh(status({ StepUpMethod: m, StepUpExpiresAt: later }), NOW)).toBe(false)
  })
  it("an expired or missing step-up does not", () => {
    expect(factorStepUpFresh(status({ StepUpMethod: "totp", StepUpExpiresAt: earlier }), NOW)).toBe(false)
    expect(factorStepUpFresh(status(), NOW)).toBe(false)
    expect(factorStepUpFresh(null, NOW)).toBe(false)
  })
})

describe("confirmMethods", () => {
  it("an account with factors confirms with them, the authenticator first", () => {
    expect(confirmMethods(status({ HasSecondFactor: true, TOTPEnabled: true, Passkeys: 2 }), true)).toEqual(["totp", "passkey"])
  })
  it("a passkey needs a browser that can use it", () => {
    expect(confirmMethods(status({ HasSecondFactor: true, Passkeys: 1 }), false)).toEqual([])
  })
  it("the password only without a second factor", () => {
    expect(confirmMethods(status(), true)).toEqual(["password"])
  })
})

describe("cleanTotpCode", () => {
  it("keeps six digits only", () => {
    expect(cleanTotpCode(" 123 456 ")).toBe("123456")
    expect(cleanTotpCode("12-34-56-78")).toBe("123456")
    expect(cleanTotpCode("abc")).toBe("")
  })
})

describe("recoveryCodesText", () => {
  it("one code a line under a heading", () => {
    expect(recoveryCodesText(["AAAA-BBBB-CCCC", "DDDD-EEEE-FFFF"], ["Title", "Note"])).toBe("Title\nNote\n\nAAAA-BBBB-CCCC\nDDDD-EEEE-FFFF\n")
  })
})

describe("recovery codes", () => {
  it("normalise as the backend does: case, spaces and dashes; O as 0, I and L as 1", () => {
    expect(normalizeRecoveryCode(" abcd-efgh 0123 ")).toBe("ABCDEFGH0123")
    expect(normalizeRecoveryCode("oil-OIL")).toBe("011011")
  })
  it.each(["AAAA-BBBB-CCCC", "aaaa bbbb cccc", "0123456789AB", "ZZZZ-YYYY-XXXX", "OOOO-IIII-LLLL"])("accepts %s", (c) => {
    expect(isRecoveryCode(c)).toBe(true)
  })
  it.each(["abc", "AAAA-BBBB-CCC", "AAAA-BBBB-CCCCD", "UUUU-BBBB-CCCC", "AAAA_BBBB_CCCC", "AAAA-BBBB-CC!C"])("refuses %s", (c) => {
    expect(isRecoveryCode(c)).toBe(false)
  })
})
