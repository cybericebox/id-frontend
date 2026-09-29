/**
 * Whole-catalog guard: uk and en carry the same keys, no blank values, and the
 * same {placeholder} names per key (so t(key, vars) fills both languages).
 */
import { describe, it, expect } from "vitest"
import en from "../../messages/en.json"
import uk from "../../messages/uk.json"
import errorsEn from "../../messages/errors.en.json"
import errorsUk from "../../messages/errors.uk.json"
import { t } from "./t"

const EN = en as Record<string, string>
const UK = uk as Record<string, string>
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe("messages uk/en parity", () => {
  it("defines the same keys in both catalogs", () => {
    expect(Object.keys(UK).sort()).toEqual(Object.keys(EN).sort())
  })

  it("has no blank values", () => {
    for (const [name, cat] of [["en", EN], ["uk", UK], ["errors.en", errorsEn], ["errors.uk", errorsUk]] as const) {
      for (const [k, v] of Object.entries(cat as Record<string, string>)) expect(v.trim(), `${name}: blank ${k}`).not.toBe("")
    }
  })

  it("uses the same placeholders in both languages", () => {
    for (const k of Object.keys(EN)) {
      if (k in UK) expect(placeholders(UK[k]), `placeholders differ for ${k}`).toEqual(placeholders(EN[k]))
    }
  })

  // errors.uk.json is intentionally partial (see apiError.ts), but every code it
  // translates must also have an English message.
  it("has an English message for every translated error code", () => {
    expect(Object.keys(errorsUk).filter((k) => !(k in errorsEn))).toEqual([])
  })
})

describe("t()", () => {
  it("fills variables and falls back to the key", () => {
    expect(t("password.tooLong", { n: 64 })).toContain("64")
    expect(t("no.such.key")).toBe("no.such.key")
  })
})
