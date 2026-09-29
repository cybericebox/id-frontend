import type { ComponentType, ReactNode } from "react"
import type { LucideProps } from "lucide-react"
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, CircleHelp, Info, Mail, ShieldCheck, Trophy, UserRound, XCircle } from "lucide-react"
import { t } from "@/i18n/t"

const icons: Record<string, ComponentType<LucideProps>> = {
  info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle,
  bell: Bell, mail: Mail, calendar: CalendarDays, user: UserRound,
  shield: ShieldCheck, trophy: Trophy, help: CircleHelp,
}
const tones: Record<string, string> = {
  neutral: "#64748B", info: "#0091EA", success: "#16A34A",
  warning: "#D97706", danger: "#DC2626",
}

export function notificationAccent(tone = "neutral", accentColor = ""): string {
  return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(accentColor) ? accentColor : tones[tone] ?? tones.neutral
}

/** The platform's notification layout, shared by the inbox and pop-ins (a copy of admin's). */
export function NotificationMessageCard({ icon = "bell", tone = "neutral", accentColor = "", title, body, timestamp, unread = false, actions, compact = false }: {
  icon?: string
  tone?: string
  accentColor?: string
  title?: string
  body?: ReactNode
  timestamp?: ReactNode
  unread?: boolean
  actions?: ReactNode
  compact?: boolean
}) {
  const accent = notificationAccent(tone, accentColor)
  const Icon = icons[icon] ?? Bell
  return <div className="flex min-w-0 items-start gap-3 text-left">
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-md ${compact ? "h-8 w-8" : "h-10 w-10"}`} style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--ib-surface))` }}>
      <Icon size={compact ? 16 : 20} strokeWidth={1.8} />
    </span>
    <div className="min-w-0 flex-1">
      {title && <div className="flex min-w-0 items-start gap-2">
        <p className={`min-w-0 flex-1 break-words text-sm leading-snug text-ink ${unread ? "font-semibold" : "font-medium"}`}>{title}</p>
        {unread && <span aria-label={t("inbox.unreadItem")} className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-action" />}
      </div>}
      {body && <div className={`${title ? "mt-1" : ""} break-words text-sm leading-relaxed text-dim ${compact ? "line-clamp-2" : ""}`}>{body}</div>}
      {timestamp && <div className="mt-1.5 text-xs text-dim">{timestamp}</div>}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  </div>
}
