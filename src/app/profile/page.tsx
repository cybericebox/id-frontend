"use client"

import React, { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiGet, ApiError } from "@/api/client"
import { t } from "@/i18n/t"
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
      const data = await apiGet<Account>("/api/account")
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
      <h1 className="mb-6 text-2xl font-semibold">{t("profile.heading")}</h1>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Left vertical tab list */}
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-48 md:flex-col">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={
                "rounded-md px-3 py-2 text-left text-sm transition-colors " +
                (active === tab.key
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50")
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

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileShell />
    </Suspense>
  )
}
