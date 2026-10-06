import type { ComponentType, ReactNode } from "react"
import type { LucideProps } from "lucide-react"
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, CircleHelp, Info, Mail, ShieldCheck, Trophy, UserRound, XCircle } from "lucide-react"
import { t } from "@/i18n/t"
import { keepBrand } from "@/i18n/brand"

const icons: Record<string, ComponentType<LucideProps>> = {
  info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle,
  bell: Bell, mail: Mail, calendar: CalendarDays, user: UserRound,
  shield: ShieldCheck, trophy: Trophy, help: CircleHelp,
}
// Theme tokens, so every tone keeps 3:1 against the surface in both themes (WCAG 1.4.11).
const tones: Record<string, string> = {
  neutral: "var(--ib-dim)", info: "var(--ib-action)", success: "var(--ib-ok)",
  warning: "var(--ib-warn)", danger: "var(--ib-danger)",
}

export function notificationAccent(tone = "neutral", accentColor = ""): string {
  return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(accentColor) ? accentColor : tones[tone] ?? tones.neutral
}

/** The platform's notification layout, shared by the inbox and pop-ins (a copy of admin's). */
export function NotificationMessageCard({ icon = "bell", tone = "neutral", accentColor = "", title, body, timestamp, unread = false, resolved = false, actions, compact = false }: {
  icon?: string
  tone?: string
  accentColor?: string
  title?: string
  body?: ReactNode
  timestamp?: ReactNode
  unread?: boolean
  /** Answered or expired: the title steps back to the secondary text colour (no opacity, text stays readable). */
  resolved?: boolean
  actions?: ReactNode
  compact?: boolean
}) {
  const accent = notificationAccent(tone, accentColor)
  const Icon = icons[icon] ?? Bell
  return <div className="flex min-w-0 items-start gap-3 text-left">
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${compact ? "h-6 w-6" : "h-8 w-8"}`} style={{ color: accent }}>
      <Icon size={compact ? 18 : 22} strokeWidth={1.8} />
    </span>
    <div className="min-w-0 flex-1">
      {title && <p className={`min-w-0 break-words text-sm leading-snug ${resolved ? "text-dim" : "text-ink"} ${unread ? "font-semibold" : "font-medium"}`}>
        {/* unread = bold title (DS: no dots) plus the word for assistive technology */}
        {unread && <span className="sr-only">{t("inbox.unreadItemSr")}</span>}
        {keepBrand(title)}
      </p>}
      {body && <div className={`${title ? "mt-1" : ""} break-words text-sm leading-relaxed text-dim ${compact ? "line-clamp-2" : ""}`}>{body}</div>}
      {timestamp && <div className="mt-1.5 text-xs text-dim">{timestamp}</div>}
      {actions && <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">{actions}</div>}
    </div>
  </div>
}
