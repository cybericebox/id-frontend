import { describe, expect, it } from "vitest"
import { bannerHref, isDismissed, parseBanners, rememberDismissed, sortBanners, type SiteBanner } from "./siteBanners"

const banner = (fields: Partial<SiteBanner> = {}): SiteBanner => ({ ID: "b1", Text: "Планові роботи", LinkURL: "", LinkLabel: "", Level: "info", Dismissible: true, Version: 1, ...fields })

function memoryStorage() {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map }
}
const brokenStorage = {
  getItem: () => { throw new Error("blocked") },
  setItem: () => { throw new Error("blocked") },
}

describe("site banner model", () => {
  it("parses tolerantly: no list or no text yields nothing", () => {
    expect(parseBanners(null)).toEqual([])
    expect(parseBanners({})).toEqual([])
    expect(parseBanners([{ ID: "x" }, { ID: "y", Text: "" }, banner()])).toEqual([banner()])
  })

  it("accepts in-app paths and http(s) links only", () => {
    expect(bannerHref("/status")).toBe("/status")
    expect(bannerHref("https://example.com/a")).toBe("https://example.com/a")
    expect(bannerHref("http://example.com")).toBe("http://example.com")
    for (const bad of ["javascript:alert(1)", "//evil.example", "data:text/html,x", "ftp://x", "", undefined, "/\\evil.example"]) {
      expect(bannerHref(bad)).toBeNull()
    }
  })

  it("orders critical before warning before info, keeping server order inside a level", () => {
    const ids = sortBanners([banner({ ID: "i1" }), banner({ ID: "w", Level: "warning" }), banner({ ID: "c", Level: "critical" }), banner({ ID: "i2" })]).map((b) => b.ID)
    expect(ids).toEqual(["c", "w", "i1", "i2"])
  })

  it("dismiss persists under ID and Version; an edited banner reappears", () => {
    const storage = memoryStorage()
    expect(isDismissed(banner(), storage)).toBe(false)
    rememberDismissed(banner(), storage)
    expect([...storage.map.keys()].some((key) => key.endsWith("b1_1"))).toBe(true)
    expect(isDismissed(banner(), storage)).toBe(true)
    expect(isDismissed(banner({ Version: 2 }), storage)).toBe(false)
  })

  it("a non-dismissible banner is never hidden by stored state", () => {
    const storage = memoryStorage()
    rememberDismissed(banner(), storage)
    expect(isDismissed(banner({ Dismissible: false }), storage)).toBe(false)
  })

  it("storage failures do not throw", () => {
    expect(() => rememberDismissed(banner(), brokenStorage)).not.toThrow()
    expect(isDismissed(banner(), brokenStorage)).toBe(false)
    expect(isDismissed(banner(), null)).toBe(false)
    expect(() => rememberDismissed(banner(), null)).not.toThrow()
  })
})

