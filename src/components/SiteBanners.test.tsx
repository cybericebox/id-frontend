import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { SiteBannerList } from "./SiteBanners"
import type { SiteBanner } from "@/lib/siteBanners"

const banner = (fields: Partial<SiteBanner> = {}): SiteBanner => ({ ID: "b1", Text: "Планові роботи", LinkURL: "", LinkLabel: "", Level: "info", Dismissible: true, Version: 1, ...fields })
const html = (banners: SiteBanner[]) => renderToStaticMarkup(<SiteBannerList banners={banners} />)

describe("site banner list", () => {
  it("renders nothing without banners", () => {
    expect(html([])).toBe("")
  })

  it("renders the text in a labelled status region", () => {
    const out = html([banner()])
    expect(out).toContain("Планові роботи")
    expect(out).toContain('role="status"')
    expect(out).toContain('aria-label="Оголошення"')
  })

  it("renders a safe link with the default or custom label", () => {
    expect(html([banner({ LinkURL: "/status" })])).toMatch(/<a [^>]*href="\/status"[^>]*>Докладніше<\/a>/)
    expect(html([banner({ LinkURL: "https://example.com/x", LinkLabel: "Деталі" })])).toContain(">Деталі</a>")
  })

  it.each(["javascript:alert(1)", "//evil.example", "data:text/html,x"])("refuses the link %s", (url) => {
    expect(html([banner({ LinkURL: url })])).not.toContain("<a ")
  })

  it("keeps the given order (the parent sorts critical first) and tints by level", () => {
    const out = html([banner({ ID: "c", Text: "Критично", Level: "critical" }), banner({ ID: "i", Text: "Інфо" })])
    expect(out.indexOf("Критично")).toBeLessThan(out.indexOf("Інфо"))
    expect(out).toContain("ib-site-banner--critical")
    expect(out).toContain("ib-site-banner--info")
  })

  it("shows the dismiss button only for dismissible banners, with a tooltip and no native title", () => {
    const out = html([banner(), banner({ ID: "b2", Dismissible: false })])
    expect(out.match(/aria-label="Закрити оголошення"/g)).toHaveLength(1)
    expect(out).toContain('role="tooltip"')
    expect(out).not.toContain("title=")
  })
})
