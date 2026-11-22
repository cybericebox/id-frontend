import { t } from "@/i18n/t"
import { cn } from "@/utils/cn"
import { ThemeSwitch } from "@/components/ThemeToggle"
import { FeedbackLink } from "@/components/FeedbackLink"
import { EmailOff } from "@/components/EmailOff"
import { CookieSettingsLink } from "@/components/CookieSettingsLink"

// The Privacy Policy and Terms links lead to NEXT_PUBLIC_PRIVACY_URL and NEXT_PUBLIC_TERMS_URL. Both anchors are always in the markup; a link
// whose setting is empty is hidden by src/styles/cfg.css (cfg-privacy, cfg-terms).
export function LegalLinks({ className }: { className?: string }) {
  return (
    <>
      <a href={process.env.NEXT_PUBLIC_PRIVACY_URL} className={cn("cfg-privacy", className)}>{t("footer.privacy")}</a>
      <a href={process.env.NEXT_PUBLIC_TERMS_URL} className={cn("cfg-terms", className)}>{t("footer.terms")}</a>
    </>
  )
}

// The one footer of every ID page that has no brand panel (and of the narrow auth layout): legal links, cookie
// settings, feedback, theme.
export function PageFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("flex flex-col items-center gap-3 px-6 pb-5 pt-4 text-xs text-dim", className)}>
      <LegalLinks className="ib-tap hover:text-ink" />
      <CookieSettingsLink className="ib-tap hover:text-ink" />
      <EmailOff><FeedbackLink className="ib-tap hover:text-ink" /></EmailOff>
      <ThemeSwitch />
    </footer>
  )
}
