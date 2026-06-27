import * as React from "react"
import { AuthSidePanel, type AuthVariant } from "./AuthSidePanel"
import { cn } from "@/utils/cn"

// Split auth layout: form on one side, decorative AuthSidePanel on the other.
// `reversed` puts the panel on the LEFT (used for sign-up to mirror sign-in).
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className={cn(
          "flex items-center justify-center bg-background px-6 py-12 md:px-10",
          reversed && "lg:order-2"
        )}
      >
        {children}
      </div>
      <AuthSidePanel variant={variant} className={reversed ? "lg:order-1" : ""} />
    </div>
  )
}
