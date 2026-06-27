"use client"

import React, { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wordmark } from "@/components/brand/Wordmark"
import { apiGet, ApiError } from "@/api/client"
import { t, locale } from "@/i18n/t"
import type { Account } from "@/components/profile/types"
import { ProfileTab } from "@/components/profile/ProfileTab"
import { AccountTab } from "@/components/profile/AccountTab"
import { SecurityTab } from "@/components/profile/SecurityTab"
import { SessionsTab } from "@/components/profile/SessionsTab"
import { ConnectionsTab } from "@/components/profile/ConnectionsTab"

type TabKey = "profile" | "account" | "security" | "sessions" | "connections"

const TABS: { key: TabKey; label: string }[] = [
  { key: "profile", label: "profile.tab.profile" },
  { key: "account", label: "profile.tab.account" },
  { key: "security", label: "profile.tab.security" },
  { key: "sessions", label: "profile.tab.sessions" },
  { key: "connections", label: "profile.tab.connections" },
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
  // return_to: rendered as a "Back" affordance when present.
  // TODO: add same-platform host validation before following the URL if
  // this page becomes accessible from untrusted contexts (open-redirect risk).
  const returnTo = searchParams.get("return_to") ?? ""

  const [active, setActive] = useState<TabKey>(
    TABS.some((x) => x.key === initialTab) ? initialTab : "profile"
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
    } catch (err) {
      // 401 → not authenticated: bounce to sign-in with return_to (full
      // silent-authn handling comes in F2.7).
      if (err instanceof ApiError && err.status === 401) {
        window.location.href =
          "/sign-in?return_to=" + encodeURIComponent(window.location.href)
        return
      }
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
    if (linkError) setActive("connections")
  }, [linkError])

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-muted-foreground">{t("profile.loading")}</p>
      </main>
    )
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
      <h1 className="mb-6 text-2xl font-semibold">{t("profile.heading")}</h1>

      {account && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-[0_10px_30px_-18px_rgba(11,18,51,0.4)]">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[#0091EA] text-xl font-semibold text-primary-foreground ring-2 ring-card">
            {account.Picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.Picture}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              `${account.FirstName?.[0] ?? ""}${account.LastName?.[0] ?? ""}`.toUpperCase() ||
              "?"
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold leading-tight">
                {account.FirstName} {account.LastName}
              </p>
              {account.Role && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {roleLabel(account.Role)}
                </span>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">{account.Email}</p>
            {memberSince(account.CreatedAt) && (
              <p className="text-xs text-muted-foreground">
                {t("profile.memberSince")} {memberSince(account.CreatedAt)}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Left vertical tab list */}
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col">
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

        {/* Tab content */}
        <div className="min-w-0 flex-1">
          {active === "profile" && (
            <ProfileTab account={account} onUpdated={load} />
          )}
          {active === "account" && <AccountTab account={account} />}
          {active === "security" && <SecurityTab account={account} />}
          {active === "sessions" && <SessionsTab />}
          {active === "connections" && (
            <ConnectionsTab
              account={account}
              linkError={linkError}
              onUpdated={load}
            />
          )}
        </div>
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
