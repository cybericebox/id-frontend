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
import { CookieSettingsButton } from "@/components/CookieSettingsButton"
import { cn } from "@/utils/cn"
import { t, tRich } from "@/i18n/t"

export type AuthVariant =
  | "signin"
  | "signup"
  | "recover"
  | "reset"
  | "setup"

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
          <span className="text-lg font-semibold tracking-tight text-on-brand">
            Cyber <span className="text-ice-on-brand">ICE</span> Box
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
          <p>
            {tRich("authPanel.legal", {
              year: YEAR,
              nure: (
                <a
                  href="https://nure.ua"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("authPanel.nureFull")}
                  className="font-normal text-on-brand-2 underline underline-offset-3 hover:text-on-brand"
                >
                  {t("authPanel.nure")}
                </a>
              ),
            })}{" "}
            <a
              href="https://ice.nure.ua/ua/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-normal text-on-brand-2 underline underline-offset-3 hover:text-on-brand"
            >
              {t("authPanel.legalLink")}
            </a>
          </p>
          {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && <CookieSettingsButton className="text-on-brand-2 hover:text-on-brand" />}
          {/* bottom-left: the reCAPTCHA badge occupies the bottom-right corner */}
          <ThemeSwitch onMass className="-ml-1.5" />
        </footer>
      </div>
    </aside>
  )
}
