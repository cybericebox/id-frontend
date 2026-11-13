import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { AuthSidePanel } from "./AuthSidePanel"

describe("AuthSidePanel footer line", () => {
  const html = renderToStaticMarkup(<AuthSidePanel variant="signin" />)

  it("has the plain copyright and the department line side by side (the flag picks one in the stylesheet)", () => {
    // the brand name is written with no-break spaces
    expect(html).toMatch(/<span class="cfg-ice-support-off">© \d{4} Cyber\u00A0ICE\u00A0Box<\/span>/)
    const full = html.slice(html.indexOf('<span class="cfg-ice-support">'))
    expect(full).toContain("За підтримки")
    expect(full).toContain("https://ice.nure.ua/ua/")
    expect(full).toContain("https://nure.ua")
  })

  it("keeps the partner links only inside the department line", () => {
    const plain = html.slice(html.indexOf("cfg-ice-support-off"), html.indexOf('<span class="cfg-ice-support">'))
    expect(plain).not.toContain("nure.ua")
  })

  it("has the legal and the cookie links of the footer", () => {
    expect(html).toContain("cfg-privacy")
    expect(html).toContain("cfg-terms")
  })
})
