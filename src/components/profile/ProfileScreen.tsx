"use client"

import React, { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  AtSign,
  ShieldCheck,
  MonitorSmartphone,
  Link2,
  User as UserIcon,
  type LucideIcon,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Wordmark } from "@/components/brand/Wordmark"
import { apiGet } from "@/api/client"
import { safeReturnTo } from "@/lib/auth"
import { PageLoader } from "@/components/ui/spinner"
import { t, locale } from "@/i18n/t"
import type { Account } from "@/components/profile/types"
import { ProfileTab } from "@/components/profile/ProfileTab"
import { AccountTab } from "@/components/profile/AccountTab"
import { SecurityTab } from "@/components/profile/SecurityTab"
import { SessionsTab } from "@/components/profile/SessionsTab"
import { ConnectionsTab } from "@/components/profile/ConnectionsTab"

type TabKey = "profile" | "account" | "security" | "sessions" | "connections"

const TABS: { key: TabKey; label: string; desc: string; icon: LucideIcon }[] = [
  { key: "profile", label: "profile.tab.profile", desc: "profile.tab.profile.desc", icon: UserIcon },
  { key: "account", label: "profile.tab.account", desc: "profile.tab.account.desc", icon: AtSign },
  { key: "security", label: "profile.tab.security", desc: "profile.tab.security.desc", icon: ShieldCheck },
  { key: "sessions", label: "profile.tab.sessions", desc: "profile.tab.sessions.desc", icon: MonitorSmartphone },
  { key: "connections", label: "profile.tab.connections", desc: "profile.tab.connections.desc", icon: Link2 },
]

// Humanize a backend role string via i18n, falling back to the raw value when
// no label key exists (t() returns the key itself on a miss).
function roleLabel(role: string): string {
  const key = `role.${role}`
  const label = t(key)
  return label === key ? role : label
}

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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await apiGet<Account>("/api/auth/account")
      setAccount(data)
    } catch {
      // A 401 is handled centrally by the api client (auto-redirect to sign-in);
      // anything else is a genuine load failure.
      setLoadError(t("profile.loadError"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
  if (isLoading && !account) {
    return <PageLoader />
  }

  if (loadError || !account) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <Alert variant="destructive">
          <AlertDescription>{loadError ?? t("profile.loadError")}</AlertDescription>
        </Alert>
      </main>
    )
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
    <main className="mx-auto max-w-4xl p-6">
      {/* Back affordance: shown when the caller (e.g. an RP app) passes return_to */}
      {returnTo && (
        <div className="mb-4">
          <Link
            href={returnTo}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            &#8592; {t("common.back")}
          </Link>
        </div>
      )}
      <div className="mb-4"><Wordmark size="md" /></div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("profile.heading")}</h1>
        <Button asChild variant="outline" size="sm">
          <a href="/sign-out">{t("common.signOut")}</a>
        </Button>
      </div>

      {account && (
        <div className="mb-6 flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-[0_10px_30px_-18px_rgba(11,18,51,0.4)]">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[#0091EA] text-xl font-semibold text-primary-foreground ring-2 ring-card">
            {account.Picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.Picture}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              `${account.FirstName?.[0] ?? ""}${account.LastName?.[0] ?? ""}`.toUpperCase() ||
              "?"
            )}
          </span>
          <div className="min-w-0 flex-1">
            {/* Role badge in the top-right corner; full name on the next line. */}
            {account.Role && (
              <div className="mb-1 flex justify-end">
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {roleLabel(account.Role)}
                </span>
              </div>
            )}
            <p className="text-lg font-semibold leading-tight break-words">
              {account.FirstName} {account.LastName}
            </p>
            <p className="break-all text-sm text-muted-foreground">{account.Email}</p>
            {memberSince(account.CreatedAt) && (
              <p className="text-xs text-muted-foreground">
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
                  className="frost-panel flex w-full items-center gap-3 rounded-xl p-4 text-left transition-colors hover:bg-accent/10"
                >
                  <tab.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t(tab.label)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t(tab.desc)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setMobileDetail(null)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
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
              className={
                "relative rounded-md px-3 py-2 text-left text-sm transition-colors " +
                (active === tab.key
                  ? "frost-panel text-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-primary before:shadow-[0_0_10px_var(--frost-glow)]"
                  : "text-muted-foreground hover:bg-accent/10")
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
