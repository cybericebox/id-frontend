// return_to accepts only our sites: the landing, id, admin, exercises and the event sites (<tag>.<domain>, one
// label) — the same strictness as backLink. The API host, deeper subdomains and anything else fall back.
import { describe, expect, it } from "vitest"

import { safeReturnTo } from "./auth"

const D = "cybericebox.local" // vitest NEXT_PUBLIC_DOMAIN

describe("safeReturnTo", () => {
  it.each([
    `https://${D}/`,
    `https://id.${D}/profile/`,
    `https://admin.${D}/users`,
    `https://exercises.${D}/catalog?x=1`,
    `https://kharkiv-ctf.${D}/tasks#a`,
  ])("keeps our site %s", (url) => {
    expect(safeReturnTo(url)).toBe(url)
  })

  it("drops a port", () => {
    expect(safeReturnTo(`https://admin.${D}:3001/x`)).toBe(`https://admin.${D}/x`)
  })

  it.each([
    `https://api.${D}/api/auth/me`,
    `https://a.b.${D}/`,
    `https://${D}.evil.test/`,
    `https://evil${D}/`,
    `http://admin.${D}/`,
    `https://user:pass@admin.${D}/`,
    "https://evil.test/",
    "javascript:alert(1)",
    "/profile/",
  ])("rejects %s", (url) => {
    expect(safeReturnTo(url, "FALLBACK")).toBe("FALLBACK")
  })
})
