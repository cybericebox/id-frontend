"use client"

import React, { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CircleCheck, LinkIcon } from "lucide-react"

import { Wordmark } from "@/components/brand/Wordmark"
import { Spinner } from "@/components/ui/spinner"
import { apiPost } from "@/api/client"
import { localizedError } from "@/i18n/apiError"
import { t } from "@/i18n/t"

// ---------------------------------------------------------------------------
// Email-change confirmation. The backend emails a link to
// /confirm-email?token=<code> (useCase/auth/email.go); the code itself
// authorizes POST /api/auth/account/email/confirm { Code } — no session needed.
// Same centered layout as /sign-out.
// ---------------------------------------------------------------------------

type State = { kind: "loading" } | { kind: "ok" } | { kind: "error"; message: string }

function ConfirmEmail() {
  const searchParams = useSearchParams()
  const code = searchParams.get("token") ?? searchParams.get("code") ?? ""
  const [state, setState] = useState<State>(
    code ? { kind: "loading" } : { kind: "error", message: t("confirmEmail.missing") }
  )

  useEffect(() => {
    if (!code) return
    let cancelled = false
    apiPost("/api/auth/account/email/confirm", { Code: code }, undefined, { required: false })
      .then(() => !cancelled && setState({ kind: "ok" }))
      .catch((err) => !cancelled && setState({ kind: "error", message: localizedError(err) }))
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8 text-center">
          {state.kind === "loading" && (
            <>
              <Spinner size="md" />
              <h1 className="text-lg font-semibold">{t("confirmEmail.inProgress")}</h1>
            </>
          )}
          {state.kind === "ok" && (
            <>
              <CircleCheck size={32} className="text-ok" aria-hidden />
              <h1 className="text-lg font-semibold">{t("confirmEmail.doneTitle")}</h1>
              <p className="text-sm text-dim">{t("confirmEmail.doneBody")}</p>
              <Link href="/profile" className="text-[13px] font-medium text-action underline-offset-3 hover:underline">
                {t("confirmEmail.toProfile")}
              </Link>
            </>
          )}
          {state.kind === "error" && (
            <>
              <LinkIcon size={32} className="text-danger" aria-hidden />
              <h1 className="text-lg font-semibold">{t("confirmEmail.failedTitle")}</h1>
              <p className="text-sm text-dim">{state.message}</p>
              <Link href="/profile" className="text-[13px] font-medium text-action underline-offset-3 hover:underline">
                {t("confirmEmail.toProfile")}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

// Suspense — useSearchParams opts out of static prerendering (output: 'export').
export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmail />
    </Suspense>
  )
}
