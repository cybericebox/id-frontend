"use client"

import React, { useState } from "react"
import Link from "next/link"
import { CircleCheck, LinkIcon } from "lucide-react"

import { Wordmark } from "@/components/brand/Wordmark"
import { PageLoader } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { apiPost } from "@/api/client"
import { localizedError } from "@/i18n/apiError"
import { t } from "@/i18n/t"
import { PageFooter } from "@/components/PageFooter"
import { inlineLinkClass } from "@/components/auth/parts"
import { useUrlParams } from "@/lib/useUrlParams"
import { forgetUrlToken, useUrlToken } from "@/lib/useUrlToken"

// ---------------------------------------------------------------------------
// Email-change confirmation. The backend emails a link to
// /confirm-email?token=<code> (useCase/auth/email.go); the code itself
// authorizes POST /api/auth/account/email/confirm { Code } — no session needed.
// The owner confirms with a click: a mail scanner that opens the link (with JS) must not confirm the change first.
// Same centered layout as /sign-out.
// ---------------------------------------------------------------------------

type State = { kind: "ready" } | { kind: "busy" } | { kind: "ok" } | { kind: "error"; message: string }

export default function ConfirmEmailPage() {
  // The token leaves the address once read (useUrlToken); null until the client knows the URL.
  const code = useUrlToken(useUrlParams())
  const [action, setAction] = useState<State>({ kind: "ready" })
  if (code === null) return <PageLoader />
  const state: State = !code && action.kind === "ready" ? { kind: "error", message: t("confirmEmail.missing") } : action

  const confirm = async () => {
    setAction({ kind: "busy" })
    try {
      await apiPost("/api/auth/account/email/confirm", { Code: code }, undefined, { required: false })
      forgetUrlToken()
      setAction({ kind: "ok" })
    } catch (err) {
      setAction({ kind: "error", message: localizedError(err) })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
    <main id="main" tabIndex={-1} className="flex flex-1 items-center justify-center p-4 outline-none">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </div>
        <div role="status" className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8 text-center">
          {(state.kind === "ready" || state.kind === "busy") && (
            <>
              <h1 className="text-lg font-semibold">{t("confirmEmail.title")}</h1>
              <p className="text-sm text-dim">{t("confirmEmail.body")}</p>
              <Button type="button" className="mt-2" busy={state.kind === "busy"} busyLabel={t("confirmEmail.inProgress")} onClick={() => void confirm()}>
                {t("confirmEmail.confirm")}
              </Button>
            </>
          )}
          {state.kind === "ok" && (
            <>
              <CircleCheck size={32} className="text-ok" aria-hidden />
              <h1 className="text-lg font-semibold">{t("confirmEmail.doneTitle")}</h1>
              <p className="text-sm text-dim">{t("confirmEmail.doneBody")}</p>
              <Link href="/profile" className={`text-xs ${inlineLinkClass}`}>
                {t("confirmEmail.toProfile")}
              </Link>
            </>
          )}
          {state.kind === "error" && (
            <>
              <LinkIcon size={32} className="text-danger" aria-hidden />
              <h1 className="text-lg font-semibold">{t("confirmEmail.failedTitle")}</h1>
              <p className="text-sm text-dim">{state.message}</p>
              <Link href="/profile" className={`text-xs ${inlineLinkClass}`}>
                {t("confirmEmail.toProfile")}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
    <PageFooter />
    </div>
  )
}
