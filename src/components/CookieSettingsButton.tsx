"use client"

import { t } from "@/i18n/t"
import { openConsentSettings } from "@/lib/consent"
import { cn } from "@/utils/cn"
import "@/styles/consent.css"

// «Налаштування cookie»: reopens the consent banner. Render only when GA is configured.
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={cn("cb-consent-link", className)} onClick={openConsentSettings}>
      {t("consent.settings")}
    </button>
  )
}
