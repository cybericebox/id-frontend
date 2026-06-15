"use client"

import React, { Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"

import { Wordmark } from "@/components/brand/Wordmark"
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

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? ""

/**
 * safeReturnTo — only follow a return_to URL whose host equals or is a subdomain
 * of the platform domain. Anything else (open-redirect attempt, empty) falls
 * back to /sign-in on the id origin. SSR/static-safe.
 */
function safeReturnTo(returnTo: string | null): string {
  if (!returnTo) return "/sign-in"
  if (typeof window === "undefined") return "/sign-in"
  try {
    const url = new URL(returnTo, window.location.origin)
    const host = url.hostname
    const ok =
      PLATFORM_DOMAIN !== "" &&
      (host === PLATFORM_DOMAIN || host.endsWith(`.${PLATFORM_DOMAIN}`))
    return ok ? url.toString() : "/sign-in"
  } catch {
    return "/sign-in"
  }
}

function SignOut() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to")

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        // Same-origin on id; clears master + local cookies via DeAuthenticate.
        await fetch("/api/auth/sign-out", {
          method: "POST",
          credentials: "include",
        })
      } catch {
        // Even if the request fails (network/offline), proceed with the
        // redirect — the user intends to leave; don't trap them on this page.
      }
      if (cancelled) return
      window.location.href = safeReturnTo(returnTo)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [returnTo])

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </div>
        <div className="frost-panel frost-in rounded-lg p-6 text-center">
          <h1 className="text-lg font-medium">{t("signOut.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("signOut.inProgress")}
          </p>
        </div>
      </div>
    </main>
  )
}

// Wrap in Suspense — useSearchParams opts out of static prerendering, required
// for `output: 'export'`.
export default function SignOutPage() {
  return (
    <Suspense>
      <SignOut />
    </Suspense>
  )
}
