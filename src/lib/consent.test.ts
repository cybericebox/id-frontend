// Cookie consent (Google Consent Mode v2): denied by default; accept all / save choice
// map to analytics_storage only; the choice is one cookie on the parent domain.
import { afterEach, describe, expect, it, vi } from "vitest"
import * as consent from "./consent"

// Minimal browser globals: a cookie jar that records every write, and a gtag spy.
function fakeBrowser(protocol = "https:") {
  const writes: string[] = []
  const gtag = vi.fn()
  const jar = new Map<string, string>()
  vi.stubGlobal("document", {
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
    set cookie(s: string) {
      writes.push(s)
      const [k, v] = s.split("; ")[0].split("=")
      if (/max-age=0\b/.test(s)) jar.delete(k)
      else jar.set(k, v)
    },
  })
  vi.stubGlobal("location", { protocol })
  vi.stubGlobal("window", { gtag, dispatchEvent: () => true })
  return { writes, gtag, jar }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("consent", () => {
  it("defaults every Consent Mode signal to denied", () => {
    expect(consent.CONSENT_DEFAULTS).toEqual({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    })
    const boot = consent.gtagBootScript("G-TEST")
    expect(boot.indexOf('"consent","default"')).toBeLessThan(boot.indexOf('"config"'))
    expect(boot).toContain('"ad_storage":"denied"')
  })

  it("grants analytics in the boot script only for a stored analytics:granted", () => {
    const run = (cookie: string) => {
      const w = { dataLayer: [] as unknown[] }
      new Function("window", "document", "dataLayer", consent.gtagBootScript("G-TEST"))(w, { cookie }, w.dataLayer)
      return (w.dataLayer as ArrayLike<unknown>[]).map((a) => Array.from(a)).filter((c) => c[0] === "consent").map((c) => c[1])
    }
    expect(run("")).toEqual(["default"])
    expect(run("cib_consent=analytics:denied")).toEqual(["default"])
    expect(run("cib_theme=dark; cib_consent=analytics:granted")).toEqual(["default", "update"])
  })

  it("accept all grants analytics_storage only", () => {
    expect(consent.consentUpdate(consent.ACCEPT_ALL)).toEqual({ analytics_storage: "granted" })
    const { gtag } = fakeBrowser()
    consent.saveConsent(consent.ACCEPT_ALL)
    expect(gtag.mock.calls).toEqual([["consent", "update", { analytics_storage: "granted" }]])
    expect(consent.readConsent()).toEqual({ analytics: true })
  })

  it("customize: save choice with analytics on grants it", () => {
    const { gtag } = fakeBrowser()
    consent.saveConsent({ analytics: true })
    expect(gtag.mock.calls).toEqual([["consent", "update", { analytics_storage: "granted" }]])
    expect(consent.readConsent()).toEqual({ analytics: true })
  })

  it("customize: save choice with analytics off keeps everything denied", () => {
    const { gtag, jar } = fakeBrowser()
    jar.set("_ga", "GA1.1.1")
    consent.saveConsent({ analytics: false })
    expect(gtag.mock.calls).toEqual([["consent", "update", { analytics_storage: "denied" }]])
    expect(consent.readConsent()).toEqual({ analytics: false })
    expect(jar.has("_ga")).toBe(false)
  })

  it("save choice with analytics off after accepting drops GA cookies", () => {
    const { gtag, jar } = fakeBrowser()
    jar.set("_ga", "GA1.1.1")
    jar.set("_ga_TEST", "GS1.1")
    consent.saveConsent({ analytics: false })
    expect(gtag.mock.calls).toEqual([["consent", "update", { analytics_storage: "denied" }]])
    expect(consent.readConsent()).toEqual({ analytics: false })
    expect(jar.has("_ga") || jar.has("_ga_TEST")).toBe(false)
  })

  it("writes the choice per category to one cookie on the parent domain", () => {
    expect(consent.consentCookie(consent.ACCEPT_ALL, { domain: "cybericebox.com", secure: true })).toBe(
      "cib_consent=analytics:granted; path=/; max-age=31536000; SameSite=Lax; domain=.cybericebox.com; Secure",
    )
    expect(consent.consentCookie({ analytics: false }, { secure: false })).toBe("cib_consent=analytics:denied; path=/; max-age=31536000; SameSite=Lax")
    vi.stubEnv("NEXT_PUBLIC_DOMAIN", "cybericebox.com")
    const { writes } = fakeBrowser()
    consent.saveConsent(consent.ACCEPT_ALL)
    expect(writes[0]).toMatch(/^cib_consent=analytics:granted; .*domain=\.cybericebox\.com; Secure$/)
  })

  it("reads the stored choice back from the cookie string", () => {
    expect(consent.parseConsent("cib_theme=dark; cib_consent=analytics:granted")).toEqual({ analytics: true })
    expect(consent.parseConsent("cib_consent=analytics:denied")).toEqual({ analytics: false })
    expect(consent.parseConsent("xcib_consent=analytics:granted")).toBeNull()
    expect(consent.parseConsent("cib_consent=granted")).toBeNull()
    expect(consent.parseConsent("")).toBeNull()
  })

  it("shows the banner only when GA is configured and no choice exists", () => {
    expect(consent.shouldShowBanner("G-TEST", null)).toBe(true)
    expect(consent.shouldShowBanner("G-TEST", { analytics: true })).toBe(false)
    expect(consent.shouldShowBanner("G-TEST", { analytics: false })).toBe(false)
    expect(consent.shouldShowBanner(undefined, null)).toBe(false)
    expect(consent.shouldShowBanner("", null)).toBe(false)
  })
})

describe("cookie policy link", () => {
  it("opens in a new tab, so the panel and its toggles stay", () => {
    expect(consent.POLICY_LINK_ATTRS).toEqual({ target: "_blank", rel: "noopener noreferrer" })
  })

  it("every link in the banner spreads POLICY_LINK_ATTRS, says so in aria-label and stops the click", async () => {
    const ts = (await import("typescript")).default
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const code = readFileSync(join(__dirname, "../components/ConsentBanner.tsx"), "utf8")
    const sf = ts.createSourceFile("ConsentBanner.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const anchors: import("typescript").JsxOpeningLikeElement[] = []
    const visit = (n: import("typescript").Node) => {
      if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText(sf) === "a") anchors.push(n)
      ts.forEachChild(n, visit)
    }
    visit(sf)
    expect(anchors.length).toBeGreaterThan(0)
    for (const a of anchors) {
      const attrs = a.attributes.properties.map((p) => p.getText(sf))
      expect(attrs).toContain("{...POLICY_LINK_ATTRS}")
      expect(attrs.some((x) => x.startsWith('aria-label={t("consent.policyLinkNewTab")'))).toBe(true)
      expect(attrs.some((x) => x.includes("stopPropagation"))).toBe(true)
    }
  })

  it("the panel has only «Зберегти вибір» and «Прийняти всі» (no «Відхилити всі»)", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const code = readFileSync(join(__dirname, "../components/ConsentBanner.tsx"), "utf8")
    expect(code).toContain('t("consent.saveChoice")')
    expect(code).not.toContain("consent.rejectAll")
    expect(code).not.toContain("consent.acceptSelected")
  })
})
