"use client"

import React, { useEffect } from "react"
import { preloadCaptcha } from "@/lib/captcha"

/**
 * CaptchaPreload loads the bot-check provider script only around the auth flows that execute it
 * (sign-in, sign-up, forgot-password), so the reCAPTCHA badge stays off other pages. With DoS protection
 * on, the invisible client-token check loads the same script on the first visit anywhere.
 */
export function CaptchaPreload({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    preloadCaptcha()
  }, [])
  return <>{children}</>
}
