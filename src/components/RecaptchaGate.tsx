"use client"

import React from "react"
import { ReCaptchaProvider } from "next-recaptcha-v3"

/**
 * RecaptchaGate mounts the reCAPTCHA v3 provider — and therefore its
 * bottom-right floating badge — ONLY around the auth flows that actually call
 * `executeRecaptcha` (sign-in, sign-up, forgot-password). It used to live in the
 * root layout, which loaded the script (and showed the badge) on every page,
 * including the profile. Scoping it here keeps the badge off pages that don't
 * use reCAPTCHA.
 *
 * No-op passthrough when NEXT_PUBLIC_RECAPTCHA_SITE_KEY is unset (local dev).
 */
export function RecaptchaGate({ children }: { children: React.ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  // includes(), not ===: the Docker build bakes a placeholder here, and a literal
  // comparison would be folded to false before the entrypoint substitutes it.
  const useEnterprise = ["true"].includes(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE ?? "")

  if (siteKey) {
    return (
      <ReCaptchaProvider reCaptchaKey={siteKey} useEnterprise={useEnterprise}>
        {children}
      </ReCaptchaProvider>
    )
  }

  return <>{children}</>
}
