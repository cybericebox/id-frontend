import * as React from "react"
import {
  Boxes,
  Users,
  Lock,
  Network,
  Server,
  Activity,
  TrendingUp,
  Gauge,
  Puzzle,
} from "lucide-react"
import { Logo } from "@/components/brand/Logo"
import { ThemeSwitch } from "@/components/ThemeToggle"
import { FeedbackLink } from "@/components/FeedbackLink"
import { EmailOff } from "@/components/EmailOff"
import { CookieSettingsLink } from "@/components/CookieSettingsLink"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"
import { BRAND_HEAD, BRAND_TAIL } from "@/i18n/brand"
import { t, tSegments } from "@/i18n/t"
import "./auth-panel.css"

export type AuthVariant =
  | "signin"
  | "signup"
  | "recover"
  | "reset"
  | "setup"

// Partner links are fixed; NEXT_PUBLIC_SHOW_PARTNERS=false hides the partner block. The container entrypoint defaults it to true.
const PARTNER_ICE_NURE_URL = "https://ice.nure.ua/ua/"
const PARTNER_NURE_URL = "https://nure.ua"
const SHOW_PARTNERS = process.env.NEXT_PUBLIC_SHOW_PARTNERS !== "false"

type Item = { icon: React.ComponentType<{ size?: number; className?: string }>; key: string }

// Each auth page gets its own copy — platform-specific, not generic.
// Titles are two lines: authPanel.<variant>.title1 / title2.
const PANELS: Record<AuthVariant, Item[]> = {
  signin: [
    { icon: Activity, key: "authPanel.item.liveTeamRating" },
    { icon: Lock, key: "authPanel.item.vpnLabs" },
    { icon: Puzzle, key: "authPanel.item.anyTask" },
  ],
  signup: [
    { icon: Boxes, key: "authPanel.item.ownEnv" },
    { icon: TrendingUp, key: "authPanel.item.liveRating" },
    { icon: Users, key: "authPanel.item.soloTeam" },
    { icon: Puzzle, key: "authPanel.item.anyTask" },
  ],
  recover: [
    { icon: Gauge, key: "authPanel.item.dynScoring" },
    { icon: Network, key: "authPanel.item.l2l3" },
    { icon: Users, key: "authPanel.item.soloTeam" },
  ],
  reset: [
    { icon: Lock, key: "authPanel.item.vpnLabs" },
    { icon: Activity, key: "authPanel.item.liveRating" },
    { icon: Puzzle, key: "authPanel.item.anyTask" },
  ],
  setup: [
    { icon: Server, key: "authPanel.item.l2l3Full" },
    { icon: Gauge, key: "authPanel.item.dynScoring" },
    { icon: Boxes, key: "authPanel.item.ownEnv" },
  ],
}

// Static export: the year is fixed at build time.
const YEAR = new Date().getFullYear()

// Faint isometric ice-cube lattice behind the panel copy, fading towards the text side.
function PanelArt() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-on-brand opacity-[0.10]"
      style={{ maskImage: "linear-gradient(100deg, transparent 15%, #000 75%)" }}
    >
      <defs>
        <pattern id="ib-cubes" width="56" height="97" patternUnits="userSpaceOnUse">
          <path
            d="M28 0 L56 16 L28 32 L0 16 Z M0 16 V48 L28 64 V32 M56 16 V48 L28 64 M28 64 V97 M0 48 L0 81 L28 97 M56 48 V81 L28 97"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ib-cubes)" />
    </svg>
  )
}

// The decorative half of the auth split layout — per-page copy on the brand
// mass (ds-v2 .ib-mass): crest, page copy, legal line. Hidden below lg.
export function AuthSidePanel({
  className,
  variant = "signin",
}: {
  className?: string
  variant?: AuthVariant
}) {
  const items = PANELS[variant]
  return (
    <aside className={cn("ib-mass relative hidden overflow-hidden lg:block", className)}>
      <PanelArt />
      {/* wide screens only: crest, per-page copy, legal line */}
      <div className="mx-auto flex h-full max-w-xl flex-col px-12 py-14">
        <div className="flex flex-col items-start gap-4">
          <Logo size={104} />
          <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-on-brand">
            {BRAND_HEAD}<span className="text-ice-on-brand">ICE</span>{BRAND_TAIL}
          </span>
        </div>

        <div className="my-auto flex flex-col gap-8 py-12">
          <h2 className="text-[40px] font-semibold leading-[1.1] text-on-brand">
            {t(`authPanel.${variant}.title1`)}
            <br />
            {t(`authPanel.${variant}.title2`)}
          </h2>
          <ul className="flex flex-col gap-4">
            {items.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-start gap-3">
                <Icon size={20} className="mt-px shrink-0 text-on-brand-3" />
                <span className="text-sm font-medium leading-snug text-on-brand-2">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="flex flex-col items-start gap-3 border-t border-brand-line pt-5 text-[13px] leading-relaxed text-on-brand-3">
          <p className="auth-legal text-[12px] xl:text-[13px]">
            {!SHOW_PARTNERS ? t("authPanel.legalPlain", { year: YEAR }) : tSegments("authPanel.legal", {
              year: YEAR,
              department: (
                <Tooltip content={t("authPanel.departmentFull")} align="start">
                  <a href={PARTNER_ICE_NURE_URL} target="_blank" rel="noopener noreferrer" className="rounded-xs font-medium whitespace-nowrap text-on-brand underline decoration-current/45 decoration-1 underline-offset-3 hover:text-ice-on-brand hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand">
                    {t("authPanel.legalLink")}
                  </a>
                </Tooltip>
              ),
              nure: (
                <Tooltip content={t("authPanel.nureFull")} align="start">
                  <a href={PARTNER_NURE_URL} target="_blank" rel="noopener noreferrer" className="rounded-xs font-medium whitespace-nowrap text-on-brand underline decoration-current/45 decoration-1 underline-offset-3 hover:text-ice-on-brand hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand">
                    {t("authPanel.nure")}
                  </a>
                </Tooltip>
              ),
            }, { groupFrom: 1 })}
          </p>
          <CookieSettingsLink className="text-on-brand-2 hover:text-on-brand" />
          <EmailOff><FeedbackLink className="text-on-brand-2 hover:text-on-brand" /></EmailOff>
          {/* bottom-left: the reCAPTCHA badge occupies the bottom-right corner */}
          <ThemeSwitch onMass className="-ml-1.5" />
        </footer>
      </div>
    </aside>
  )
}
