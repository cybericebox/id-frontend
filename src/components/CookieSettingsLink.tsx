"use client"

import { t } from "@/i18n/t"
import { interceptSettingsLink } from "@/lib/consent"
import { mainOrigin } from "@/lib/origins"
import { cn } from "@/utils/cn"
import "@/styles/consent.css"

// The Cookie Policy lives on the main site.
export const COOKIE_POLICY_HREF = `${mainOrigin === "/" ? "" : mainOrigin}/cookies`

// «Налаштування файлів cookie», always shown: a link to the cookie policy that, with JS, opens
// the consent preferences panel instead (see lib/consent).
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <a href={COOKIE_POLICY_HREF} className={cn("cb-consent-link", className)} onClick={interceptSettingsLink}>
      {t("consent.settings")}
    </a>
  )
}
