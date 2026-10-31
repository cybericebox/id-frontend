import { t } from "@/i18n/t"
import { mainOrigin } from "@/lib/origins"
import { cn } from "@/utils/cn"
import { ThemeSwitch } from "@/components/ThemeToggle"
import { FeedbackLink } from "@/components/FeedbackLink"
import { EmailOff } from "@/components/EmailOff"
import { CookieSettingsLink } from "@/components/CookieSettingsLink"

const LEGAL_LINKS = [
  { href: `${mainOrigin}/privacy`, label: "footer.privacy" },
  { href: `${mainOrigin}/terms`, label: "footer.terms" },
] as const

// Legal pages live on the main site.
export function LegalLinks({ className }: { className?: string }) {
  return (
    <>
      {LEGAL_LINKS.map((link) => (
        <a key={link.label} href={link.href} className={className}>{t(link.label)}</a>
      ))}
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
