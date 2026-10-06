"use client"

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  AtSign,
  ShieldCheck,
  MonitorSmartphone,
  Link2,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react"

import { Wordmark } from "@/components/brand/Wordmark"
import { apiGet, mediaUrl } from "@/api/client"
import { ThemeSwitch } from "@/components/ThemeToggle"
import { safeReturnTo } from "@/lib/auth"
import { backLabel } from "@/lib/backLink"
import { useBackLink } from "@/lib/useBackLink"
import { Tooltip } from "@/components/ui/tooltip"
import { ErrorScreen } from "@/components/ErrorPage"
import { onServiceRestored } from "@/lib/serviceStatus"
import { PageLoader } from "@/components/ui/spinner"
import { t, locale } from "@/i18n/t"
import type { Account } from "@/components/profile/types"
import { ProfileTab } from "@/components/profile/ProfileTab"
import { AccountTab } from "@/components/profile/AccountTab"
import { SecurityTab } from "@/components/profile/SecurityTab"
import { SessionsTab } from "@/components/profile/SessionsTab"
import { ConnectionsTab } from "@/components/profile/ConnectionsTab"
import { InboxButton } from "@/components/profile/InboxButton"
import { AccountMenu } from "@/components/profile/AccountMenu"
import { initials } from "@/lib/initials"
import { roleLabel } from "@/lib/roles"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { focusTab, nextTabIndex } from "@/lib/tablist"

const BACK_ARROW_CLASS = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-action"

type TabKey = "profile" | "account" | "security" | "sessions" | "connections"

const TABS: { key: TabKey; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "profile", label: "profile.tab.profile", desc: "profile.tab.profile.desc", icon: UserIcon },
  { key: "account", label: "profile.tab.account", desc: "profile.tab.account.desc", icon: AtSign },
  { key: "security", label: "profile.tab.security", desc: "profile.tab.security.desc", icon: ShieldCheck },
  { key: "sessions", label: "profile.tab.sessions", desc: "profile.tab.sessions.desc", icon: MonitorSmartphone },
  { key: "connections", label: "profile.tab.connections", desc: "profile.tab.connections.desc", icon: Link2 },
]

// Format the join date for "Member since"; returns "" for missing/invalid input.
function memberSince(createdAt: string): string {
  if (!createdAt) return ""
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ""
  // Include the day so locales with grammatical cases (e.g. Ukrainian) render the
  // month in the genitive ("27 червня 2026") rather than nominative ("червень").
  return d.toLocaleDateString(locale, {
    day: "numeric",
    year: "numeric",
    month: "long",
  })
}

const tabId = (key: TabKey) => `profile-tab-${key}`
const panelId = (key: TabKey) => `profile-panel-${key}`

function ProfileShell() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const linkError = searchParams.get("error") === "link_failed"
  // return_to: rendered as a "Back" affordance when present. Sanitized via
  // safeReturnTo (same-platform https only) to prevent open-redirect / javascript:
  // URL injection; an invalid value falls back to "" so the Back link is hidden.
  const returnTo = safeReturnTo(searchParams.get("return_to") ?? "", "")
  // Coming from admin, an event site or the catalog (return_to, else the referrer; kept for the
  // tab): the arrow leads there with a destination tooltip. Otherwise it stays the plain Back.
  const back = useBackLink(searchParams.get("return_to"))
  const backKey = backLabel(back)

  // The section lives in the URL (?tab=): reload, Back and a shared link keep the place. Without ?tab= desktop shows
  // the first section and mobile shows the list of sections.
  const requestedTab = searchParams.get("tab")
  const urlTab = TABS.find((x) => x.key === requestedTab)?.key ?? null
  // Coming back from a failed «Підключити Google» lands on the connections section.
  const tab: TabKey | null = urlTab ?? (linkError ? "connections" : null)
  const active: TabKey = tab ?? "profile"

  const selectTab = (key: TabKey | null, mode: "push" | "replace") => {
    const next = new URLSearchParams(searchParams.toString())
    if (key) next.set("tab", key)
    else next.delete("tab")
    const query = next.toString()
    const href = query ? `${pathname}?${query}` : pathname
    if (mode === "push") router.push(href, { scroll: false })
    else router.replace(href, { scroll: false })
  }

  // Mobile master-detail focus: the opened section takes focus, closing returns it to its row.
  const detailRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef(new Map<TabKey, HTMLButtonElement>())
  const lastOpenedRef = useRef<TabKey | null>(null)
  const mobileDetail = isDesktop ? null : tab
  useEffect(() => {
    if (mobileDetail) {
      lastOpenedRef.current = mobileDetail
      detailRef.current?.focus()
    } else if (lastOpenedRef.current) {
      rowsRef.current.get(lastOpenedRef.current)?.focus()
      lastOpenedRef.current = null
    }
  }, [mobileDetail])

  const [account, setAccount] = useState<Account | null>(null)
  const [loadError, setLoadError] = useState<{ error: unknown } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiGet<Account>("/api/auth/account")
      setAccount(data)
      setLoadError(null)
    } catch (err) {
      // A 401 is handled centrally by the api client (auto-redirect to sign-in).
      setLoadError({ error: err })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Backend came back after an outage (the app-wide overlay handled it) → refetch.
  useEffect(() => onServiceRestored(() => void load()), [load])

  // Only show the full-page loading state on the INITIAL load. A refetch (e.g.
  // after an avatar upload) keeps the rendered profile mounted, so the avatar
  // doesn't unmount/remount and flash the initials placeholder before the image.
  // Keep the error page (not the loader) during its own background retries.
  if (isLoading && !account && !loadError) {
    return <PageLoader />
  }

  if (!account) {
    // A failed session check (5xx, network) shows the error page with a retry, never an endless
    // loader. The app-wide overlay (ServiceStatusGate) may come on top of it; a refetch on restore
    // clears it. A 401 never lands here: the api client redirects to sign-in.
    if (!loadError) return <PageLoader />
    return <ErrorScreen onRetry={load} error={loadError.error} title={t("profile.loadError")} />
  }

  // Render the content for a given tab — shared by the desktop pane and the
  // mobile detail view (account is non-null past the guards above).
  const renderTab = (key: TabKey) => {
    switch (key) {
      case "profile":
        return <ProfileTab account={account} onUpdated={load} />
      case "account":
        return <AccountTab account={account} />
      case "security":
        return <SecurityTab account={account} />
      case "sessions":
        return <SessionsTab />
      case "connections":
        return (
          <ConnectionsTab account={account} linkError={linkError} onUpdated={load} />
        )
    }
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-6 outline-none sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4">
          <Wordmark size="md" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitch />
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            <InboxButton defaultTab="personal" />
            <AccountMenu account={account} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          {back && backKey ? (
            <Tooltip content={t(backKey)} align="start">
              <a href={back.href} aria-label={t(backKey)} className={BACK_ARROW_CLASS}><ArrowLeft size={18} aria-hidden="true" /></a>
            </Tooltip>
          ) : returnTo && (
            <Tooltip content={t("common.back")} align="start">
              <Link href={returnTo} aria-label={t("common.back")} className={BACK_ARROW_CLASS}><ArrowLeft size={18} aria-hidden="true" /></Link>
            </Tooltip>
          )}
          <h1 className="text-2xl font-semibold">{t("profile.heading")}</h1>
        </div>
      </header>

      {account && (
        <div className="mb-6 flex items-start gap-4 rounded-lg border border-line bg-surface p-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-xl font-semibold text-on-brand">
            {account.Picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(account.Picture)}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              initials(account.FirstName, account.LastName, account.Email)
            )}
          </span>
          <div className="min-w-0 flex-1">
            {/* Role badge in the top-right corner; full name on the next line. */}
            {account.Role && (
              <div className="mb-1 flex justify-end">
                <span className="shrink-0 rounded-sm bg-soft px-2 py-0.5 text-xs font-medium text-ink">
                  {roleLabel(account.Role)}
                </span>
              </div>
            )}
            <p className="text-lg font-semibold leading-tight break-words">
              {account.FirstName} {account.LastName}
            </p>
            <p className="break-all text-sm text-dim">{account.Email}</p>
            {memberSince(account.CreatedAt) && (
              <p className="text-xs text-faint">
                {t("profile.memberSinceDate", { date: memberSince(account.CreatedAt) })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* One render of the active section (no hidden twin): desktop is a vertical tablist beside the panel,
          mobile is master-detail (the list of sections, then one section with a back button). */}
      {isDesktop ? (
        <div className="flex gap-6">
          <div role="tablist" aria-orientation="vertical" aria-label={t("profile.tabs")} className="flex w-48 shrink-0 flex-col gap-1">
            {TABS.map((item, index) => (
              <button
                key={item.key}
                id={tabId(item.key)}
                type="button"
                role="tab"
                aria-selected={active === item.key}
                aria-controls={panelId(item.key)}
                tabIndex={active === item.key ? 0 : -1}
                onClick={() => selectTab(item.key, "replace")}
                onKeyDown={(event) => {
                  const to = nextTabIndex(event, index, TABS.length, "vertical")
                  if (to === null) return
                  event.preventDefault()
                  selectTab(TABS[to].key, "replace")
                  focusTab(event.currentTarget, to)
                }}
                className={
                  "rounded-md px-3 py-2 text-left text-sm transition-colors " +
                  (active === item.key
                    ? "bg-hover font-medium text-ink"
                    : "text-dim hover:bg-hover hover:text-ink")
                }
              >
                {t(item.label)}
              </button>
            ))}
          </div>
          <div id={panelId(active)} role="tabpanel" aria-labelledby={tabId(active)} tabIndex={0} className="min-w-0 flex-1 outline-offset-4">
            {renderTab(active)}
          </div>
        </div>
      ) : mobileDetail === null ? (
        <ul className="space-y-2">
          {TABS.map((item) => (
            <li key={item.key}>
              <button
                ref={(node) => {
                  if (node) rowsRef.current.set(item.key, node)
                  else rowsRef.current.delete(item.key)
                }}
                type="button"
                onClick={() => selectTab(item.key, "push")}
                className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:bg-hover"
              >
                <item.icon className="h-5 w-5 shrink-0 text-dim" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t(item.label)}</span>
                  <span className="block truncate text-xs text-dim">
                    {t(item.desc)}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-faint" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => selectTab(null, "push")}
            className="inline-flex min-h-10 items-center gap-1 text-sm text-dim hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t("profile.backToSections")}
          </button>
          <div
            ref={detailRef}
            role="region"
            aria-label={t(TABS.find((x) => x.key === mobileDetail)?.label ?? "")}
            tabIndex={-1}
            className="outline-none"
          >
            {renderTab(mobileDetail)}
          </div>
        </div>
      )}
    </main>
  )
}

export function ProfileScreen() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProfileShell />
    </Suspense>
  )
}
