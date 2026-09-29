// «Налаштування файлів cookie» is always shown and the consent panel is mounted even without GA.
import { readFileSync } from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CONSENT_OPEN_EVENT, interceptSettingsLink } from "@/lib/consent"
import { Analytics } from "./Analytics"
import { CookieSettingsLink } from "./CookieSettingsLink"

const src = (p: string) => readFileSync(path.resolve(import.meta.dirname, "..", p), "utf8")

afterEach(() => vi.unstubAllGlobals())

describe("cookie settings entry", () => {
  it("renders as a link to the cookie policy", () => {
    const html = renderToStaticMarkup(<CookieSettingsLink />)
    expect(html).toMatch(/^<a href="[^"]*\/cookies"/)
    expect(html).toContain("cb-consent-link")
  })

  it("a click opens the panel and does not navigate", () => {
    const events: string[] = []
    vi.stubGlobal("window", { dispatchEvent: (e: Event) => events.push(e.type) })
    const e = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true } }
    interceptSettingsLink(e)
    expect(e.defaultPrevented).toBe(true)
    expect(events).toEqual([CONSENT_OPEN_EVENT])
  })

  it("is not gated on GA anywhere it appears", () => {
    for (const f of ["components/auth/AuthLayout.tsx", "components/auth/AuthSidePanel.tsx", "components/profile/AccountMenu.tsx", "app/layout.tsx"]) {
      expect(src(f), f).not.toMatch(/GOOGLE_ANALYTICS_ID &&/)
    }
    expect(src("components/profile/AccountMenu.tsx")).toMatch(/href=\{COOKIE_POLICY_HREF\}[\s\S]*?preventDefault\(\)[\s\S]*?openConsentSettings/)
  })

  it("without GA mounts only the consent panel, no gtag script", () => {
    const html = renderToStaticMarkup(<Analytics />)
    expect(html).not.toContain("googletagmanager")
    expect(src("components/Analytics.tsx")).toMatch(/if \(!gaId\) return <ConsentBanner \/>/)
  })
})
