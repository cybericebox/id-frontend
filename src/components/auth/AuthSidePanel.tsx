import * as React from "react"
import {
  Boxes,
  Flag,
  Users,
  ShieldCheck,
  Lock,
  Network,
  Server,
  Activity,
  TrendingUp,
  Gauge,
} from "lucide-react"
import { Logo } from "@/components/brand/Logo"
import { cn } from "@/utils/cn"

export type AuthVariant =
  | "signin"
  | "signup"
  | "recover"
  | "reset"
  | "setup"

type Item = { icon: React.ComponentType<{ size?: number; className?: string }>; text: string }
type Panel = { eyebrow: string; title: React.ReactNode; items: Item[] }

// Each auth page gets its own copy — platform-specific, not generic.
const PANELS: Record<AuthVariant, Panel> = {
  signin: {
    eyebrow: "Вхід",
    title: (
      <>
        Продовжуйте навчання
        <br />
        та практику.
      </>
    ),
    items: [
      { icon: Activity, text: "Рейтинг команд оновлюється в реальному часі під час події" },
      { icon: Lock, text: "Ізольовані лабораторії з доступом через VPN (WireGuard)" },
      { icon: Flag, text: "Завдання будь-якого типу" },
    ],
  },
  signup: {
    eyebrow: "Реєстрація",
    title: (
      <>
        Платформа практичної
        <br />
        кібербезпеки.
      </>
    ),
    items: [
      { icon: Boxes, text: "Власне ізольоване середовище для кожної команди" },
      { icon: TrendingUp, text: "Рейтинг у реальному часі під час подій" },
      { icon: Users, text: "Індивідуальна та командна гра" },
      { icon: Flag, text: "Завдання будь-якого типу" },
    ],
  },
  recover: {
    eyebrow: "Відновлення доступу",
    title: (
      <>
        Відновіть доступ
        <br />
        до облікового запису.
      </>
    ),
    items: [
      { icon: Gauge, text: "Динамічний скоринг завдань" },
      { icon: Network, text: "Емуляція мережевих топологій рівнів L2/L3" },
      { icon: Users, text: "Індивідуальна та командна гра" },
    ],
  },
  reset: {
    eyebrow: "Безпека акаунта",
    title: (
      <>
        Встановіть
        <br />
        новий пароль.
      </>
    ),
    items: [
      { icon: Lock, text: "Ізольовані лабораторії з доступом через VPN (WireGuard)" },
      { icon: Activity, text: "Рейтинг у реальному часі під час подій" },
      { icon: Flag, text: "Завдання будь-якого типу" },
    ],
  },
  setup: {
    eyebrow: "Завершення реєстрації",
    title: (
      <>
        Залишився
        <br />
        останній крок.
      </>
    ),
    items: [
      { icon: Server, text: "Емуляція повноцінних мережевих топологій L2/L3" },
      { icon: Gauge, text: "Динамічний скоринг завдань" },
      { icon: Boxes, text: "Власне ізольоване середовище для кожної команди" },
    ],
  },
}

// The decorative half of the auth split layout — per-page copy, ice gradient,
// grid texture and a large faded brand crest watermark.
export function AuthSidePanel({
  className,
  variant = "signin",
}: {
  className?: string
  variant?: AuthVariant
}) {
  const panel = PANELS[variant]
  return (
    <div
      className={cn(
        "relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center",
        "bg-gradient-to-br from-secondary via-accent to-secondary px-12 py-16 text-foreground",
        className
      )}
    >
      {/* grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, #000 35%, transparent 90%)",
        }}
      />
      {/* faded crest watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-10 opacity-[0.06]"
      >
        <Logo size={420} />
      </div>

      <div className="relative mx-auto flex max-w-md flex-col gap-8">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {panel.eyebrow}
          </span>
          <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight">
            {panel.title}
          </h2>
        </div>
        <ul className="flex flex-col gap-4">
          {panel.items.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                <Icon size={18} />
              </span>
              <span className="pt-1 text-sm font-medium leading-snug">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
