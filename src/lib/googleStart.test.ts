// The Google start URL carries return_to and, when the page knows the address, Google's login_hint (the account
// chooser preselects it): the address typed in the form, else the one the caller passed (?login_hint=).
import { describe, expect, it } from "vitest"

import { googleHint, googleStartUrl } from "./googleStart"

const API = "https://api.cybericebox.local"

describe("googleStartUrl", () => {
  it("adds return_to and login_hint only when present", () => {
    expect(googleStartUrl("/api/auth/google", {})).toBe(`${API}/api/auth/google`)
    expect(googleStartUrl("/api/auth/google", { returnTo: "https://admin.x/", loginHint: "a@b.test" }))
      .toBe(`${API}/api/auth/google?return_to=${encodeURIComponent("https://admin.x/")}&login_hint=a%40b.test`)
  })
})

describe("googleHint", () => {
  it("prefers a valid typed address, then the caller's hint, else none", () => {
    expect(googleHint(" Olena@Example.com ", "x@y.test")).toBe("olena@example.com")
    expect(googleHint("not-an-email", "x@y.test")).toBe("x@y.test")
    expect(googleHint("", "bad hint")).toBe("")
    expect(googleHint(undefined, null)).toBe("")
  })
})
