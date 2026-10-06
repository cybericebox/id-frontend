import * as React from "react"
import { AuthSidePanel, type AuthVariant } from "./AuthSidePanel"
import { cn } from "@/utils/cn"
import { ThemeSwitch } from "@/components/ThemeToggle"
import { FeedbackLink } from "@/components/FeedbackLink"
import { EmailOff } from "@/components/EmailOff"
import { CookieSettingsLink } from "@/components/CookieSettingsLink"
import { Wordmark } from "@/components/brand/Wordmark"

// Split auth layout (ds-v2 auth-split): brand-mass panel + form on paper.
// Panel side alternates per page as before: `reversed` puts the panel on the
// LEFT (sign-up, recover, setup); otherwise it sits on the right (sign-in, reset).
// `variant` selects the per-page copy shown on the panel.
export function AuthLayout({
  children,
  reversed = false,
  variant = "signin",
}: {
  children: React.ReactNode
  reversed?: boolean
  variant?: AuthVariant
}) {
  return (
    <div
      className={cn(
        // form column ≈58%, brand panel ≈42%; flex-1 of the body (min-h-dvh), so a site banner above does not add a page scroll
        "grid flex-1",
        reversed
          ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          : "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      )}
    >
      {/* DOM order is the reading and tab order: the form column first, the decorative panel after it.
          lg:order-* only places them on the screen (the panel side alternates per page). */}
      <div
        className={cn(
          "flex flex-col bg-paper",
          reversed ? "lg:order-2" : "lg:order-1"
        )}
      >
        {/* narrow screens: the panel is hidden, so the lockup moves above the form */}
        <header className="px-6 pt-5 lg:hidden">
          <Wordmark size="md" />
        </header>
        <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center px-6 py-12 outline-none md:px-10">
          {children}
        </main>
        {/* narrow screens: theme switch at the bottom (on wide screens it sits in the panel footer) */}
        <footer className="flex flex-col items-center gap-3 px-6 pb-5 text-[13px] text-dim lg:hidden">
          <CookieSettingsLink className="hover:text-ink" />
          <EmailOff><FeedbackLink className="hover:text-ink" /></EmailOff>
          <ThemeSwitch />
        </footer>
      </div>
      <AuthSidePanel variant={variant} className={reversed ? "lg:order-1" : "lg:order-2"} />
    </div>
  )
}
