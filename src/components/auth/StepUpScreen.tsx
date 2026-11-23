"use client"

import React, { useCallback, useEffect, useState } from "react"

import { apiGet, ApiError } from "@/api/client"
import { REAUTH_REQUIRED, getSecondFactorStatus, type SecondFactorStatus } from "@/api/secondFactor"
import { ConfirmFields, confirmErrorPlace, useConfirmForm } from "@/components/profile/StepUpFields"
import type { Account } from "@/components/profile/types"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/ui/form-error"
import { LoadError } from "@/components/ui/load-error"
import { LoadingArea } from "@/components/ui/spinner"
import { t } from "@/i18n/t"
import { redirectToSignIn, safeReturnTo } from "@/lib/auth"
import { passkeysSupported } from "@/lib/passkey"
import { confirmMethods } from "@/lib/stepUp"
import { useUrlParams } from "@/lib/useUrlParams"
import { AuthLayout } from "./AuthLayout"
import { AuthHeading, AuthPane, inlineLinkClass } from "./parts"

type Loaded = { status: SecondFactorStatus; hasPassword: boolean }

/**
 * /step-up?return_to=: confirm the signed-in person on this session (5 minutes), then go back. A passkey with user
 * verification or an authenticator code; the password only for an account without a second factor. return_to goes
 * through the same guard as every auth page (safeReturnTo: our sites only, else the profile).
 */
export function StepUpScreen() {
  const params = useUrlParams()
  const returnTo = params?.get("return_to") ?? ""
  const [data, setData] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async () => {
    try {
      // without a session the api client goes to sign-in and comes back here
      const [status, account] = await Promise.all([getSecondFactorStatus(), apiGet<Account>("/api/auth/account")])
      setData({ status, hasPassword: account.HasPassword })
      setLoadError(null)
    } catch (err) {
      setLoadError(err)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const methods = data ? confirmMethods(data.status, passkeysSupported()) : []
  const form = useConfirmForm(methods, data?.hasPassword ?? false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async () => {
    if (!form.ready || !form.method || busy) return
    const method = form.method
    setBusy(true)
    setFormError(null)
    form.setFieldError(null)
    try {
      await form.confirm()
      // The button stays busy while the browser navigates.
      window.location.assign(safeReturnTo(returnTo || undefined))
    } catch (err) {
      setBusy(false)
      if (err instanceof ApiError && err.code === REAUTH_REQUIRED) {
        redirectToSignIn(err.signInUrl, window.location.href)
        return
      }
      const place = confirmErrorPlace(err, method)
      if (place.field) form.setFieldError(place.field)
      else setFormError(place.form ?? null)
    }
  }

  return (
    <AuthLayout variant="signin">
      <AuthPane>
        <AuthHeading title={t("stepUp.title")} subtitle={t("stepUp.subtitle")} />
        <div className="min-h-40">
          {data === null && !loadError ? (
            <LoadingArea label={t("common.loading")} />
          ) : data === null ? (
            <LoadError message={t("stepUp.loadError")} error={loadError} onRetry={() => { setLoadError(null); void load() }} />
          ) : (
            <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); void submit() }}>
              <ConfirmFields idPrefix="step-up" methods={methods} form={form} hasPassword={data.hasPassword} disabled={busy} />
              <FormError message={formError} />
              {methods.length > 0 && (
                <Button type="submit" className="w-full" busy={busy} busyLabel={t("common.busy.confirming")} disabled={!form.ready}>
                  {form.method === "passkey" ? t("stepUp.submitPasskey") : t("stepUp.submit")}
                </Button>
              )}
            </form>
          )}
        </div>
        <p className="mt-1 flex justify-center text-xs text-dim">
          <a href={safeReturnTo(returnTo || undefined)} className={inlineLinkClass}>{t("stepUp.back")}</a>
        </p>
      </AuthPane>
    </AuthLayout>
  )
}
