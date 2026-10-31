// Touch: every small control gets a 44 px hit area (.ib-tap under pointer:coarse) without changing how it looks.
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { PasswordInput } from "./password-input"
import { authLinkClass, inlineLinkClass } from "@/components/auth/parts"

const src = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8")

describe("touch targets", () => {
  it("the 44 px hit area exists for coarse pointers only", () => {
    expect(src("../../app/globals.css")).toMatch(/@media \(pointer: coarse\)\s*\{[^@]*\.ib-tap::after\s*\{[^}]*width: max\(100%, 44px\);[^}]*height: max\(100%, 44px\);/)
  })

  it("small buttons, the password toggle and inline links carry it", () => {
    expect(renderToStaticMarkup(<Button size="sm">x</Button>)).toContain("ib-tap")
    expect(renderToStaticMarkup(<Button>x</Button>)).not.toContain("ib-tap")
    expect(renderToStaticMarkup(<PasswordInput />)).toMatch(/<button[^>]*class="[^"]*ib-tap/)
    expect(inlineLinkClass).toContain("ib-tap")
    expect(authLinkClass).toContain("ib-tap")
  })

  it("the profile back arrow and the auth footer links carry it", () => {
    expect(src("../profile/ProfileScreen.tsx")).toMatch(/const BACK_ARROW_CLASS = "ib-tap /)
    for (const file of ["../PageFooter.tsx", "../auth/AuthSidePanel.tsx"]) {
      expect(src(file).match(/<(?:CookieSettingsLink|FeedbackLink) className="ib-tap /g), file).toHaveLength(2)
    }
  })

  it("the consent checkbox is 24 px on touch", () => {
    expect(renderToStaticMarkup(<Checkbox label="x" />)).toContain("pointer-coarse:size-6")
  })
})
