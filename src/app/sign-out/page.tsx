"use client"

import React, { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Wordmark } from "@/components/brand/Wordmark"
import { Button } from "@/components/ui/button"
import { LoadError } from "@/components/ui/load-error"
import { PageLoader } from "@/components/ui/spinner"
import { safeReturnTo } from "@/lib/auth"
import { apiUrl } from "@/api/client"
import { clearAccountDrafts } from "@/lib/drafts"
import { t } from "@/i18n/t"
import { PageFooter } from "@/components/PageFooter"

// ---------------------------------------------------------------------------
// SSO sign-out
//
// The master session cookie lives on the id (Authorization Server) domain, so
// the logout MUST run here — RP apps (main/admin) only link to this page.
//
// Flow:
//   1. The page asks: a GET never signs out, so a link or a redirect from
//      another site cannot log anyone out (logout CSRF).
//   2. «Вийти» sends POST /api/auth/sign-out — the daemon's DeAuthenticate
//      clears the master + local cookies.
//   3. Only a 2xx (or a 401: the session is already gone) counts as signed out:
//      then the drafts go and the browser goes to a validated return_to, or
//      /sign-in. A network error or a 5xx shows the error with a retry, so the
//      user never leaves a shared computer believing they signed out.
// ---------------------------------------------------------------------------

type State = "ready" | "busy" | "failed"

function SignOut() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to")
  const [state, setState] = useState<State>("ready")
  const [error, setError] = useState<unknown>(null)

  const signOut = async () => {
    setState("busy")
    setError(null)
    try {
      // Hits api.<domain> (apiUrl); a bare relative path would 404 on the id origin.
      const res = await fetch(apiUrl("/api/auth/sign-out"), { method: "POST", credentials: "include" })
      if (!res.ok && res.status !== 401) {
        setError({ status: res.status })
        setState("failed")
        return
      }
    } catch (err) {
      setError(err)
      setState("failed")
      return
    }
    // unsaved profile drafts never outlive the session in this tab
    clearAccountDrafts()
    // The button stays busy while the browser leaves. The shared guard strips any port and rejects other hosts.
    window.location.href = safeReturnTo(returnTo ?? undefined, "/sign-in/")
  }

  return (
    <div className="flex min-h-dvh flex-col">
    <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center p-4 outline-none">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </div>
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-surface p-8 text-center">
          {state === "failed" ? (
            <LoadError message={t("signOut.failed")} error={error} onRetry={() => void signOut()} />
          ) : (
            <>
              <h1 className="text-lg font-semibold">{t("signOut.question")}</h1>
              <p className="text-sm text-dim">{t("signOut.body")}</p>
              <Button type="button" data-sign-out className="mt-2" busy={state === "busy"} busyLabel={t("signOut.inProgress")} onClick={() => void signOut()}>
                {t("signOut.confirm")}
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
    <PageFooter />
    </div>
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
