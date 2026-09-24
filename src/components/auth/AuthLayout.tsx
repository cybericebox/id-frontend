import * as React from "react"
import { AuthSidePanel, type AuthVariant } from "./AuthSidePanel"
import { cn } from "@/utils/cn"
import { ThemeSwitch } from "@/components/ThemeToggle"
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
        // form column ≈58%, brand panel ≈42%
        "grid min-h-dvh",
        reversed
          ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
          : "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
      )}
    >
      <AuthSidePanel variant={variant} className={reversed ? "lg:order-1" : "lg:order-2"} />
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
        <div className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
          {children}
        </div>
        {/* narrow screens: theme switch at the bottom (on wide screens it sits in the panel footer) */}
        <footer className="flex justify-center px-6 pb-5 lg:hidden">
          <ThemeSwitch />
        </footer>
      </div>
    </div>
  )
}
