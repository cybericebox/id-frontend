import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { correction, generate } from "lean-qr"

import { QrCode } from "./QrCode"

describe("QrCode", () => {
  it("draws the otpauth URI as one SVG path with its label, on a quiet zone", () => {
    const uri = "otpauth://totp/Cyber%20ICE%20Box:olena%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Cyber%20ICE%20Box"
    const html = renderToStaticMarkup(<QrCode value={uri} label="QR" />)
    const n = generate(uri, { minCorrectionLevel: correction.M }).size
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="QR"')
    expect(html).toContain(`viewBox="-4 -4 ${n + 8} ${n + 8}"`)
    expect(html).toMatch(/<path d="M[^"]+"/)
  })

  it("a value it cannot encode renders the fallback, never throws", () => {
    const html = renderToStaticMarkup(<QrCode value={"x".repeat(8000)} label="QR" fallback={<p>manual</p>} />)
    expect(html).toBe("<p>manual</p>")
  })
})
