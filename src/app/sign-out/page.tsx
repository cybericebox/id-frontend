"use client"

import React, { Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"

import { Wordmark } from "@/components/brand/Wordmark"
import { PageLoader, Spinner } from "@/components/ui/spinner"
import { safeReturnTo } from "@/lib/auth"
import { apiUrl } from "@/api/client"
import { t } from "@/i18n/t"

// ---------------------------------------------------------------------------
// SSO sign-out
//
// The master session cookie lives on the id (Authorization Server) domain, so
// the logout MUST run here — RP apps (main/admin) only link to this page.
//
// Flow:
//   1. POST /api/auth/sign-out (same-origin on id) — the daemon's DeAuthenticate
//      clears the master + local cookies.
//   2. Redirect to a validated return_to, or fall back to /sign-in.
//
// NOTE: cross-domain /me + sign-out cookie handoff is verified during dev-env
// smoke; here we only drive the same-origin logout + safe redirect.
// ---------------------------------------------------------------------------

function SignOut() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to")

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        // Hits api.<domain> (apiUrl); clears master + local cookies via
        // DeAuthenticate. A bare relative path would 404 on the id origin.
        await fetch(apiUrl("/api/auth/sign-out"), {
          method: "POST",
          credentials: "include",
        })
      } catch {
        // Even if the request fails (network/offline), proceed with the
        // redirect — the user intends to leave; don't trap them on this page.
      }
      if (cancelled) return
      // Fall back to /sign-in (not /profile) after a logout; the shared guard
      // strips any port and rejects off-platform return_to values.
      window.location.href = safeReturnTo(returnTo ?? undefined, "/sign-in/")
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [returnTo])

  return (
    <main id="main" tabIndex={-1} className="flex min-h-dvh items-center justify-center p-4 outline-none">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8 text-center">
          <Spinner size="md" />
          <h1 className="text-lg font-semibold">{t("signOut.title")}</h1>
          <p className="text-sm text-dim">{t("signOut.inProgress")}</p>
        </div>
      </div>
    </main>
  )
}

// Wrap in Suspense — useSearchParams opts out of static prerendering, required
// for `output: 'export'`.
export default function SignOutPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SignOut />
    </Suspense>
  )
}
