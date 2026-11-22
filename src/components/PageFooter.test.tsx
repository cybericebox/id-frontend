import { afterEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { LegalLinks } from "./PageFooter"

afterEach(() => vi.unstubAllEnvs())

const anchors = (html: string) => [...html.matchAll(/<a\b[^>]*>[^<]*<\/a>/g)].map((m) => m[0])

describe("LegalLinks", () => {
  it("links the Privacy Policy and the Terms to their settings, in that order, each with its hiding class", () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVACY_URL", "https://example.org/privacy")
    vi.stubEnv("NEXT_PUBLIC_TERMS_URL", "https://example.org/terms")
    const [privacy, terms] = anchors(renderToStaticMarkup(<LegalLinks className="x" />))
    expect(privacy).toContain('href="https://example.org/privacy"')
    expect(privacy).toContain("cfg-privacy")
    expect(terms).toContain('href="https://example.org/terms"')
    expect(terms).toContain("cfg-terms")
  })

  it("keeps both anchors when the settings are empty (the stylesheet hides them)", () => {
    vi.stubEnv("NEXT_PUBLIC_PRIVACY_URL", "")
    vi.stubEnv("NEXT_PUBLIC_TERMS_URL", "")
    expect(anchors(renderToStaticMarkup(<LegalLinks />))).toHaveLength(2)
  })

  it("never builds a link from the base domain", () => {
    const html = renderToStaticMarkup(<LegalLinks />)
    expect(html).not.toContain("cybericebox.local")
  })
})
