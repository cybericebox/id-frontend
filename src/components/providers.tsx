"use client"

import React from "react"
import { ReCaptchaProvider } from "next-recaptcha-v3"

/**
 * Client-side providers wrapper.
 * ReCaptchaProvider is only rendered when a site key is configured;
 * in local dev without NEXT_PUBLIC_RECAPTCHA_SITE_KEY it is a no-op passthrough.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  // When the backend runs reCAPTCHA Enterprise (operator default), the site key is
  // an Enterprise key and the provider must load enterprise.js to mint valid tokens.
  const useEnterprise = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE === "true"

  if (siteKey) {
    return (
      <ReCaptchaProvider reCaptchaKey={siteKey} useEnterprise={useEnterprise}>
        {children}
      </ReCaptchaProvider>
    )
  }

  return <>{children}</>
}
