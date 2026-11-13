"use client"

import { t } from "@/i18n/t"
import { interceptSettingsLink } from "@/lib/consent"
import { cn } from "@/utils/cn"
import "@/styles/consent.css"

// The Cookie Policy link (NEXT_PUBLIC_COOKIES_URL; empty = none). The settings links that use it open the consent panel on click, so with the setting
// empty they stay links and only lose their target.
export const COOKIE_POLICY_HREF = process.env.NEXT_PUBLIC_COOKIES_URL

// «Налаштування файлів cookie», always shown: a link to the cookie policy that, with JS, opens
// the consent preferences panel instead (see lib/consent).
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <a href={COOKIE_POLICY_HREF} className={cn("cb-consent-link", className)} onClick={interceptSettingsLink}>
      {t("consent.settings")}
    </a>
  )
}
