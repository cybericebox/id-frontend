import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { DEFAULT_PASSWORD_POLICY as policy } from "@/lib/passwordPolicy"
import { PasswordStrength } from "@/components/ui/password-strength"
import { AuthSidePanel } from "./AuthSidePanel"


describe("password strength and panel heading", () => {
  it("the strength line carries the id the field points at", () => {
    expect(renderToStaticMarkup(<PasswordStrength id="s1" value="abc" policy={policy} />)).toContain('id="s1"')
  })

  it("the panel headline is one balanced line of text, without a forced break", () => {
    const html = renderToStaticMarkup(<AuthSidePanel variant="signin" />)
    const h2 = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/)?.[0] ?? ""
    expect(h2).toContain("text-balance")
    expect(h2).not.toContain("<br")
  })
})
