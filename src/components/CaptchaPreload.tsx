"use client"

import React, { useEffect } from "react"
import { preloadCaptcha } from "@/lib/captcha"

/**
 * CaptchaPreload loads the bot-check provider script only around the auth flows that execute it
 * (sign-in, sign-up, forgot-password), so the reCAPTCHA badge stays off other pages.
 */
export function CaptchaPreload({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    preloadCaptcha()
  }, [])
  return <>{children}</>
}
