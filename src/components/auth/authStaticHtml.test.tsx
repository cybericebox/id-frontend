import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { ForgotPasswordScreen } from "./ForgotPasswordScreen"
import { ResetPasswordScreen } from "./ResetPasswordScreen"
import { SignInScreen } from "./SignInScreen"
import { SignUpScreen } from "./SignUpScreen"
import { AuthLayout } from "./AuthLayout"
import { Logo } from "@/components/brand/Logo"

// The server pass (static export) has no router: stub what the screens read from next/navigation.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
  usePathname: () => "/sign-in/",
  useSearchParams: () => new URLSearchParams(),
}))

const at = (html: string, needle: string) => {
  const i = html.indexOf(needle)
  expect(i, `missing ${needle}`).toBeGreaterThanOrEqual(0)
  return i
}

describe("auth pages in the static HTML", () => {
  const screens = { signIn: SignInScreen, signUp: SignUpScreen, forgot: ForgotPasswordScreen, reset: ResetPasswordScreen }

  for (const [name, Screen] of Object.entries(screens)) {
    it(`${name}: h1 and the form are rendered without a loader`, () => {
      const html = renderToStaticMarkup(<Screen />)
      expect(html).toContain("<h1")
      expect(html).toContain("<form")
      expect(html).not.toContain("loading-area-page")
    })

    it(`${name}: one <main>, the form comes before the side panel, h1 before h2`, () => {
      const html = renderToStaticMarkup(<Screen />)
      expect(html.match(/<main /g)).toHaveLength(1)
      expect(at(html, '<main id="main"')).toBeLessThan(at(html, "<aside"))
      expect(at(html, "<h1")).toBeLessThan(at(html, "<h2"))
    })
  }

  it("the panel keeps its screen side through order classes", () => {
    const left = renderToStaticMarkup(<AuthLayout reversed><h1>x</h1></AuthLayout>)
    expect(left).toMatch(/<aside[^>]*lg:order-1/)
    const right = renderToStaticMarkup(<AuthLayout><h1>x</h1></AuthLayout>)
    expect(right).toMatch(/<aside[^>]*lg:order-2/)
  })

  it("the feedback mailto sits between Cloudflare email_off markers", () => {
    const html = renderToStaticMarkup(<AuthLayout><h1>x</h1></AuthLayout>)
    expect(html).toContain("<!--email_off-->")
    expect(html).toContain("<!--/email_off-->")
    const mailto = html.indexOf('href="mailto:')
    expect(html.lastIndexOf("<!--email_off-->", mailto)).toBeGreaterThan(html.lastIndexOf("<!--/email_off-->", mailto))
  })
})

describe("crest", () => {
  it("is a file, not an inlined data URI", () => {
    const html = renderToStaticMarkup(<Logo />)
    expect(html).toContain('src="/crest-128.png"')
    expect(html).not.toContain("data:image")
  })
})
