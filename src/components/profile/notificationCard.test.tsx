import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { NotificationMessageCard, notificationAccent } from "./NotificationMessageCard"
import { inlineLinkClass } from "@/components/auth/parts"
import { Alert } from "@/components/ui/alert"

const src = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

describe("notification card", () => {
  it("tones are theme tokens, not hex constants", () => {
    for (const tone of ["neutral", "info", "success", "warning", "danger"]) {
      expect(notificationAccent(tone)).toMatch(/^var\(--ib-/)
    }
  })

  it("marks unread by the bold title and a screen-reader word, with no dot and no icon tile", () => {
    const html = renderToStaticMarkup(<NotificationMessageCard title="Тема" unread />)
    expect(html).toContain("font-semibold")
    expect(html).toContain("sr-only")
    expect(html).not.toContain("rounded-full")
    expect(html).not.toContain("color-mix")
  })

  it("a resolved row is not faded by opacity", () => {
    expect(src("./InboxButton.tsx")).not.toContain('resolved ? "opacity-60"')
  })
})

describe("pop-in", () => {
  it("does not nest a status role in the live region and never auto-dismisses an action", () => {
    const popIn = src("./NotificationPopIn.tsx")
    expect(popIn).not.toContain('role="status"')
    expect(popIn).toContain("if (paused || action) return")
    expect(popIn).toContain("onTouchStart")
  })

  it("resolving one row disables only its own button", () => {
    expect(src("./InboxButton.tsx")).toContain("disabled={resolving === item.ID}")
  })
})

describe("links in text and busy states", () => {
  it("inline links are underlined at rest", () => {
    expect(inlineLinkClass).toContain("underline")
    expect(inlineLinkClass).not.toContain("no-underline")
  })

  it("the email change button shows the crest busy state, not «Завантаження…»", () => {
    const account = src("./AccountTab.tsx")
    expect(account).not.toContain("common.loading")
    expect(account).toContain("busy={isSubmitting}")
  })

  it("sign-in uses the busy button", () => {
    expect(src("../auth/SignInScreen.tsx")).toContain("busy={isSubmitting}")
    expect(src("../auth/SignInScreen.tsx")).not.toContain("signIn.inProgress")
  })
})

describe("alert roles", () => {
  it("errors interrupt, neutral and success wait", () => {
    expect(renderToStaticMarkup(<Alert variant="destructive" />)).toContain('role="alert"')
    expect(renderToStaticMarkup(<Alert />)).toContain('role="status"')
    expect(renderToStaticMarkup(<Alert variant="success" />)).toContain('role="status"')
  })
})

describe("profile", () => {
  it("renders each section once and keeps the section in the URL", () => {
    const screen = src("./ProfileScreen.tsx")
    expect(screen).not.toContain("hidden gap-6 md:flex")
    expect(screen).not.toContain("md:hidden")
    expect(screen).toContain('role="tablist"')
    expect(screen).toContain('next.set("tab", key)')
  })
})
