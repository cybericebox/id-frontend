"use client"

import React, { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
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
import { isServiceUnavailable } from "@/i18n/apiError"
import { PageError } from "@/components/PageError"
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

function ProfileShell() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TabKey) || "profile"
  const linkError = searchParams.get("error") === "link_failed"
  // return_to: rendered as a "Back" affordance when present. Sanitized via
  // safeReturnTo (same-platform https only) to prevent open-redirect / javascript:
  // URL injection; an invalid value falls back to "" so the Back link is hidden.
  const returnTo = safeReturnTo(searchParams.get("return_to") ?? "", "")

  const [active, setActive] = useState<TabKey>(
    TABS.some((x) => x.key === initialTab) ? initialTab : "profile"
  )
  // Mobile master-detail: null = section list; a key = that section open (with a
  // back arrow). Desktop ignores this and uses the side-nav + `active`.
  const [mobileDetail, setMobileDetail] = useState<TabKey | null>(
    searchParams.get("tab") ? initialTab : null
  )
  const [account, setAccount] = useState<Account | null>(null)
  const [loadError, setLoadError] = useState<{ unavailable: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiGet<Account>("/api/auth/account")
      setAccount(data)
      setLoadError(null)
    } catch (err) {
      // A 401 is handled centrally by the api client (auto-redirect to sign-in).
      // Backend down / gateway 5xx → "temporarily unavailable" with auto-retry;
      // anything else is a genuine load failure.
      setLoadError({ unavailable: isServiceUnavailable(err) })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Backend came back after an outage (the app-wide overlay handled it) → refetch.
  useEffect(() => onServiceRestored(() => void load()), [load])

  // If the user just linked Google, jump them to the Connections tab.
  useEffect(() => {
    if (linkError) {
      setActive("connections")
      setMobileDetail("connections")
    }
  }, [linkError])

  // Only show the full-page loading state on the INITIAL load. A refetch (e.g.
  // after an avatar upload) keeps the rendered profile mounted, so the avatar
  // doesn't unmount/remount and flash the initials placeholder before the image.
  // Keep the error page (not the loader) during its own background retries.
  if (isLoading && !account && !loadError) {
    return <PageLoader />
  }

  if (!account) {
    // Unreachable backend is shown by the app-wide overlay (ServiceStatusGate);
    // keep the loader underneath until it refetches on restore.
    if (!loadError || loadError.unavailable) return <PageLoader />
    return <PageError onRetry={load} />
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
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
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
          {returnTo && <Link href={returnTo} aria-label={t("common.back")} title={t("common.back")} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-action"><ArrowLeft size={18} aria-hidden="true" /></Link>}
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
                {t("profile.memberSince")} {memberSince(account.CreatedAt)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile: master-detail. List of sections by default; tapping one opens
          that section with a back arrow. */}
      <div className="md:hidden">
        {mobileDetail === null ? (
          <ul className="space-y-2">
            {TABS.map((tab) => (
              <li key={tab.key}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(tab.key)
                    setMobileDetail(tab.key)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:bg-hover"
                >
                  <tab.icon className="h-5 w-5 shrink-0 text-dim" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t(tab.label)}</span>
                    <span className="block truncate text-xs text-dim">
                      {t(tab.desc)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMobileDetail(null)}
              className="inline-flex items-center gap-1 text-sm text-dim hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
              {t(TABS.find((x) => x.key === mobileDetail)?.label ?? "")}
            </button>
            {renderTab(mobileDetail)}
          </div>
        )}
      </div>

      {/* Desktop: left vertical tab list + content. */}
      <div className="hidden gap-6 md:flex">
        <nav className="flex w-48 shrink-0 flex-col gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              aria-current={active === tab.key ? "page" : undefined}
              className={
                "rounded-md px-3 py-2 text-left text-sm transition-colors " +
                (active === tab.key
                  ? "bg-hover font-medium text-ink"
                  : "text-dim hover:bg-hover hover:text-ink")
              }
            >
              {t(tab.label)}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{renderTab(active)}</div>
      </div>
    </main>
  )
}

export function ProfileScreen() {
  return (
    <Suspense>
      <ProfileShell />
    </Suspense>
  )
}
