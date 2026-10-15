"use client"

import { Fragment, useEffect, useId, useRef, useState } from "react"
import { ChevronDown, MessageSquare } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { apiGet, mediaUrl } from "@/api/client"
import { t } from "@/i18n/t"
import { ACCOUNT_MENU_ICON_PROPS, ACCOUNT_MENU_ICONS, ACCOUNT_MENU_LABELS, accountMenu, catalogAllowed } from "@/lib/accountMenu"
import { adminOrigin, exercisesOrigin } from "@/lib/origins"
import type { Account } from "@/components/profile/types"
import { initials } from "@/lib/initials"
import { openConsentSettings } from "@/lib/consent"
import { FeedbackLink } from "@/components/FeedbackLink"
import { THEME_OPTIONS, useThemeChoice } from "@/components/ThemeToggle"
import { COOKIE_POLICY_HREF } from "@/components/CookieSettingsLink"

// Unified account menu (lib/accountMenu): same entries, labels and icons in every app.
const ICON_CLASS = "shrink-0 text-dim group-focus:text-accent-foreground"

export function AccountMenu({ account }: { account: Account }) {
  const [themeChoice, selectTheme] = useThemeChoice()
  const [themeExpanded, setThemeExpanded] = useState(false)
  const themeChoicesId = useId()
  const themeTriggerRef = useRef<HTMLDivElement>(null)
  const currentTheme = THEME_OPTIONS.find((option) => option.value === themeChoice)!
  const ThemeIcon = currentTheme.icon
  const adminTier = Boolean(account.Role) && account.Role !== "user"
  // Event staff open the catalog too (GET /exercises/access, the catalog's own rule).
  const [staff, setStaff] = useState(false)
  useEffect(() => {
    if (adminTier) return
    let cancelled = false
    apiGet<Parameters<typeof catalogAllowed>[0]>("/api/exercises/access", undefined, { required: false })
      .then((access) => { if (!cancelled) setStaff(catalogAllowed(access)) })
      .catch(() => { if (!cancelled) setStaff(false) })
    return () => { cancelled = true }
  }, [adminTier])

  const entries = accountMenu(
    "id",
    { adminTier, catalog: adminTier || staff, returnTo: "" },
    { id: "", admin: adminOrigin, exercises: exercisesOrigin },
  )
  const fullName = `${account.FirstName} ${account.LastName}`.trim() || account.Email
  const avatarInitials = initials(account.FirstName, account.LastName, account.Email)

  return (
    <DropdownMenu onOpenChange={(open) => { if (!open) setThemeExpanded(false) }}>
      <DropdownMenuTrigger
        aria-label={t("nav.accountMenu")}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand text-sm font-medium text-on-brand focus-visible:outline-2 focus-visible:outline-action"
      >
        {account.Picture ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images
          <img src={mediaUrl(account.Picture)} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          avatarInitials
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-2rem)] overflow-y-auto">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="break-words font-medium">{fullName}</span>
          <span className="break-all text-xs font-normal text-dim">{account.Email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          ref={themeTriggerRef}
          className="gap-2"
          aria-expanded={themeExpanded}
          aria-controls={themeChoicesId}
          onSelect={(event) => { event.preventDefault(); setThemeExpanded((expanded) => !expanded) }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") { event.preventDefault(); setThemeExpanded(true) }
            if (event.key === "ArrowLeft") { event.preventDefault(); setThemeExpanded(false) }
          }}
        >
          <ThemeIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-dim" />
          <span>{t("theme.label")}</span>
          <span className="ml-auto text-xs text-dim">{t(currentTheme.label)}</span>
          <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${themeExpanded ? "rotate-180" : ""}`} />
        </DropdownMenuItem>
        {themeExpanded && (
          <DropdownMenuRadioGroup
            id={themeChoicesId}
            aria-label={t("theme.label")}
            value={themeChoice}
            onValueChange={(value) => selectTheme(value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault()
                setThemeExpanded(false)
                themeTriggerRef.current?.focus()
              }
            }}
          >
            {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
              <DropdownMenuRadioItem key={value} value={value} className="gap-2"><Icon aria-hidden="true" className="h-4 w-4" />{t(label)}</DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
        <DropdownMenuSeparator />
        {entries.map((entry, i) => {
          if (entry.kind === "divider") return <DropdownMenuSeparator key={i} />
          if (entry.kind === "cookies") {
            const Icon = ACCOUNT_MENU_ICONS.cookies
            // A link to the cookie policy. With JS only the navigation is cancelled (on the native event,
            // so the menu still sees the select and closes); the panel opens once focus is back on the trigger.
            return (
              <Fragment key={i}>
                <DropdownMenuItem asChild className="group gap-2" onSelect={() => { window.setTimeout(openConsentSettings, 0) }}>
                  <a href={COOKIE_POLICY_HREF} aria-label={t(ACCOUNT_MENU_LABELS.cookiesAria)} onClick={(e) => e.nativeEvent.preventDefault()}>
                    <Icon {...ACCOUNT_MENU_ICON_PROPS} className={ICON_CLASS} />{t(ACCOUNT_MENU_LABELS.cookies)}
                  </a>
                </DropdownMenuItem>
                {/* the profile pages have no footer, so «Надіслати відгук» is a normal menu item here */}
                <DropdownMenuItem asChild className="group gap-2">
                  <FeedbackLink><MessageSquare {...ACCOUNT_MENU_ICON_PROPS} className={ICON_CLASS} />{t("feedback.link")}</FeedbackLink>
                </DropdownMenuItem>
              </Fragment>
            )
          }
          const key = entry.kind === "signOut" ? "signOut" : entry.key
          const Icon = ACCOUNT_MENU_ICONS[key]
          return (
            <DropdownMenuItem key={key} asChild className="group gap-2">
              <a href={entry.kind === "signOut" ? "/sign-out/" : entry.href}>
                <Icon {...ACCOUNT_MENU_ICON_PROPS} className={ICON_CLASS} />{t(ACCOUNT_MENU_LABELS[key])}
              </a>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
