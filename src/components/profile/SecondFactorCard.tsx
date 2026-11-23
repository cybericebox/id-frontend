"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Copy, ListOrdered, ShieldAlert, ShieldCheck, Smartphone, Trash2 } from "lucide-react"

import { ApiError } from "@/api/client"
import {
  REAUTH_REQUIRED,
  STEP_UP_REQUIRED,
  TOTP_CODE_USED,
  TOTP_INVALID_CODE,
  beginTotp,
  finishTotp,
  getSecondFactorStatus,
  regenerateRecoveryCodes,
  removeTotp,
  type ConfirmMethod,
  type SecondFactorStatus,
  type TotpEnrolment,
} from "@/api/secondFactor"
import { QrCode } from "@/components/QrCode"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fieldErrorMessage } from "@/components/ui/form-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadError } from "@/components/ui/load-error"
import { LoadingArea } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { localizedError } from "@/i18n/apiError"
import { locale, t } from "@/i18n/t"
import { redirectToSignIn } from "@/lib/auth"
import { passkeysSupported } from "@/lib/passkey"
import { cleanTotpCode, confirmMethods, factorStepUpFresh, groupSecret, TOTP_DIGITS } from "@/lib/stepUp"
import { RecoveryCodesDialog } from "./RecoveryCodesDialog"
import { ConfirmFields, confirmErrorPlace, useConfirmForm, type ConfirmForm } from "./StepUpFields"
import type { Account } from "./types"

const STEP_UP_WINDOW_MS = 5 * 60_000
const RECOVERY_CODE_COUNT = 10

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
}

/**
 * "Two-step verification" in Sign-in and security: the authenticator app (set up with a QR code and its first code,
 * removed after a confirmation), the recovery codes (shown once, replaced on demand) and the status from
 * GET /api/auth/second-factor. Every change updates the shown status in place; only the first load shows the loader.
 * `refreshKey` changes when the passkeys change elsewhere: the status is read again in the background.
 */
export function SecondFactorCard({ account, refreshKey = 0 }: { account: Account; refreshKey?: number }) {
  const [status, setStatus] = useState<SecondFactorStatus | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  // Bumped by every local change: a background read that started before it is stale and is dropped.
  const versionRef = useRef(0)
  const loadedRef = useRef(false)
  const change = (next: (s: SecondFactorStatus) => SecondFactorStatus) => {
    versionRef.current++
    setStatus((s) => (s ? next(s) : s))
  }

  const load = useCallback(async () => {
    const version = versionRef.current
    try {
      const next = await getSecondFactorStatus()
      if (version === versionRef.current) setStatus(next)
      loadedRef.current = true
      setLoadError(null)
    } catch (err) {
      // a failed background read keeps what is shown; only the first load shows the error state
      if (!loadedRef.current) setLoadError(err)
    }
  }, [])
  useEffect(() => { void load() }, [load, refreshKey])

  const fresh = factorStepUpFresh(status)
  const methods = status ? confirmMethods(status, passkeysSupported()) : []
  const markStepUp = (method: ConfirmMethod) => change((s) => ({ ...s, StepUpMethod: method, StepUpExpiresAt: new Date(Date.now() + STEP_UP_WINDOW_MS).toISOString() }))
  const clearStepUp = () => change((s) => ({ ...s, StepUpMethod: null, StepUpExpiresAt: null }))

  // A failed confirmation or action: a stale sign-in goes to sign-in and back, a missing step-up brings the fields
  // back, an error of the code or password stays beside its field, the rest on the dialog.
  const fail = (err: unknown, confirmed: ConfirmMethod | null, form: ConfirmForm, setFormError: (m: string) => void) => {
    if (err instanceof ApiError && err.code === REAUTH_REQUIRED) {
      redirectToSignIn(err.signInUrl, window.location.href)
      return
    }
    if (err instanceof ApiError && err.code === STEP_UP_REQUIRED) {
      clearStepUp()
      setFormError(localizedError(err))
      return
    }
    const place = confirmed ? confirmErrorPlace(err, confirmed) : { form: localizedError(err) }
    if (place.field) form.setFieldError(place.field)
    else setFormError(place.form ?? localizedError(err))
  }

  // -- set up: confirm, then the QR code and the first code ---------------------------------------------------------
  const [startOpen, setStartOpen] = useState(false)
  const [startBusy, setStartBusy] = useState(false)
  const [startError, setStartError] = useState("")
  const startMethods: ConfirmMethod[] = status?.HasSecondFactor ? (fresh ? [] : methods) : ["password"]
  const startForm = useConfirmForm(startMethods, account.HasPassword)
  const startReady = status?.HasSecondFactor ? fresh || (startMethods.length > 0 && startForm.ready) : startForm.ready

  const openStart = () => { startForm.reset(); setStartError(""); setStartOpen(true) }
  // Closing or finishing a dialog forgets what was typed (the password, a code).
  const closeStart = () => { setStartOpen(false); startForm.reset(); setStartError("") }
  const start = async () => {
    setStartBusy(true)
    setStartError("")
    startForm.setFieldError(null)
    let confirmed: ConfirmMethod | null = null
    try {
      let enrolment: TotpEnrolment
      if (!status?.HasSecondFactor) {
        // the first factor: the current password confirms it (an account without one, a recent sign-in)
        confirmed = "password"
        enrolment = await beginTotp(account.HasPassword ? startForm.password : undefined)
      } else {
        if (!fresh && startForm.method) {
          confirmed = startForm.method
          await startForm.confirm()
          markStepUp(startForm.method)
        }
        confirmed = null
        enrolment = await beginTotp()
      }
      closeStart()
      setScanCode("")
      setScanCodeError(null)
      setScanError("")
      setEnrolment(enrolment)
    } catch (err) {
      fail(err, confirmed, startForm, setStartError)
    } finally {
      setStartBusy(false)
    }
  }

  const [enrolment, setEnrolment] = useState<TotpEnrolment | null>(null)
  const [scanCode, setScanCode] = useState("")
  const [scanCodeError, setScanCodeError] = useState<string | null>(null)
  const [scanError, setScanError] = useState("")
  const [scanBusy, setScanBusy] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)
  const [shownCodes, setShownCodes] = useState<string[] | null>(null)
  // The secret and the typed code go with the dialog.
  const closeScan = () => { setEnrolment(null); setScanCode(""); setScanCodeError(null); setScanError("") }

  const finish = async () => {
    if (scanCode.length !== TOTP_DIGITS) { setScanCodeError(t("validation.totpCode")); return }
    setScanBusy(true)
    setScanError("")
    setScanCodeError(null)
    try {
      const codes = await finishTotp(scanCode)
      // A factor change forgets every step-up of the account (backend afterFactorChange).
      change((s) => ({
        ...s,
        TOTPEnabled: true,
        TOTPConfirmedAt: new Date().toISOString(),
        HasSecondFactor: true,
        RecoveryCodesLeft: codes.length > 0 ? codes.length : s.RecoveryCodesLeft,
        StepUpMethod: null,
        StepUpExpiresAt: null,
      }))
      closeScan()
      toast.success(t("totp.added"))
      if (codes.length > 0) setShownCodes(codes)
    } catch (err) {
      const fieldError = fieldErrorMessage(err, [TOTP_INVALID_CODE, TOTP_CODE_USED])
      if (fieldError) setScanCodeError(fieldError)
      else if (err instanceof ApiError && err.code === STEP_UP_REQUIRED) { clearStepUp(); setScanError(localizedError(err)) }
      else setScanError(localizedError(err))
    } finally {
      setScanBusy(false)
    }
  }

  const copySecret = async () => {
    if (!enrolment) return
    try {
      await navigator.clipboard.writeText(enrolment.Secret)
      toast.success(t("totp.secretCopied"))
    } catch {
      toast.error(localizedError(null))
    }
  }

  // -- remove -------------------------------------------------------------------------------------------------------
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState("")
  const removeForm = useConfirmForm(methods, account.HasPassword)
  const openRemove = () => { removeForm.reset(); setRemoveError(""); setRemoveOpen(true) }
  const closeRemove = () => { setRemoveOpen(false); removeForm.reset(); setRemoveError("") }
  const remove = async () => {
    setRemoveBusy(true)
    setRemoveError("")
    removeForm.setFieldError(null)
    let confirmed: ConfirmMethod | null = null
    try {
      if (!fresh && removeForm.method) {
        confirmed = removeForm.method
        await removeForm.confirm()
        markStepUp(removeForm.method)
      }
      confirmed = null
      await removeTotp()
      change((s) => ({
        ...s,
        TOTPEnabled: false,
        TOTPConfirmedAt: null,
        HasSecondFactor: s.Passkeys > 0,
        // the recovery codes go with the last factor
        RecoveryCodesLeft: s.Passkeys > 0 ? s.RecoveryCodesLeft : 0,
        StepUpMethod: null,
        StepUpExpiresAt: null,
      }))
      closeRemove()
      toast.success(t("totp.removed"))
    } catch (err) {
      fail(err, confirmed, removeForm, setRemoveError)
    } finally {
      setRemoveBusy(false)
    }
  }

  // -- new recovery codes -------------------------------------------------------------------------------------------
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)
  const [regenError, setRegenError] = useState("")
  const regenForm = useConfirmForm(methods, account.HasPassword)
  const openRegen = () => { regenForm.reset(); setRegenError(""); setRegenOpen(true) }
  const closeRegen = () => { setRegenOpen(false); regenForm.reset(); setRegenError("") }
  const regenerate = async () => {
    setRegenBusy(true)
    setRegenError("")
    regenForm.setFieldError(null)
    let confirmed: ConfirmMethod | null = null
    try {
      if (!fresh && regenForm.method) {
        confirmed = regenForm.method
        await regenForm.confirm()
        markStepUp(regenForm.method)
      }
      confirmed = null
      const codes = await regenerateRecoveryCodes()
      change((s) => ({ ...s, RecoveryCodesLeft: codes.length }))
      closeRegen()
      setShownCodes(codes)
    } catch (err) {
      fail(err, confirmed, regenForm, setRegenError)
    } finally {
      setRegenBusy(false)
    }
  }

  const needsFields = !fresh
  const lastFactor = status ? status.Passkeys === 0 : false

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("secondFactor.title")}</CardTitle>
        <CardDescription>{t("secondFactor.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === null && !loadError ? (
          <LoadingArea label={t("common.loading")} />
        ) : status === null ? (
          <LoadError message={t("secondFactor.loadError")} error={loadError} onRetry={() => { setLoadError(null); void load() }} />
        ) : (
          <>
            {status.StepUpMethod === "recovery-code" && fresh && (
              <Alert>
                <AlertDescription>{t("secondFactor.recoveryNotice")}</AlertDescription>
              </Alert>
            )}
            <p className="flex items-start gap-2 text-sm text-ink">
              {status.HasSecondFactor
                ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
                : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-dim" aria-hidden="true" />}
              <span>{status.HasSecondFactor ? t("secondFactor.statusOn") : t("secondFactor.statusOff")}</span>
            </p>
            {status.Passkeys > 0 && <p className="text-xs text-dim">{t("secondFactor.passkeys", { n: status.Passkeys })}</p>}

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone className="h-4 w-4 shrink-0 text-dim" aria-hidden="true" />
                  {t("totp.title")}
                </p>
                <p className="mt-1 text-xs text-dim">
                  {status.TOTPEnabled
                    ? (status.TOTPConfirmedAt ? t("totp.enabledSince", { date: formatDate(status.TOTPConfirmedAt) }) : t("totp.enabled"))
                    : t("totp.notSet")}
                </p>
              </div>
              {status.TOTPEnabled ? (
                <Button variant="outline" size="sm" aria-label={t("totp.removeLabel")} onClick={openRemove}>
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : (
                <Button variant="outline" onClick={openStart}>{t("totp.setUp")}</Button>
              )}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <ListOrdered className="h-4 w-4 shrink-0 text-dim" aria-hidden="true" />
                  {t("recoveryCodes.title")}
                </p>
                <p className={status.HasSecondFactor && status.RecoveryCodesLeft === 0 ? "mt-1 text-xs text-danger" : "mt-1 text-xs text-dim"}>
                  {!status.HasSecondFactor
                    ? t("recoveryCodes.needFactor")
                    : status.RecoveryCodesLeft > 0
                      ? t("recoveryCodes.left", { n: status.RecoveryCodesLeft, total: RECOVERY_CODE_COUNT })
                      : t("recoveryCodes.none")}
                </p>
              </div>
              {status.HasSecondFactor && (
                <Button variant="outline" onClick={openRegen}>{t("recoveryCodes.regenerate")}</Button>
              )}
            </div>
          </>
        )}

        <ConfirmDialog
          open={startOpen}
          onCancel={closeStart}
          busy={startBusy}
          busyLabel={t("common.busy.preparingSetup")}
          error={startError}
          title={t("totp.startTitle")}
          description={t("totp.startBody")}
          confirmLabel={t("totp.startConfirm")}
          disabled={!startReady}
          onConfirm={() => void start()}
        >
          {(!status?.HasSecondFactor || needsFields) && (
            <ConfirmFields idPrefix="totp-start" methods={startMethods} form={startForm} hasPassword={account.HasPassword} disabled={startBusy} />
          )}
        </ConfirmDialog>

        <Dialog open={enrolment !== null} onOpenChange={(next) => { if (!next && !scanBusy) closeScan() }}>
          <DialogContent className="max-w-md" onOpenAutoFocus={(event) => { event.preventDefault(); codeRef.current?.focus() }}>
            <DialogHeader>
              <DialogTitle>{t("totp.scanTitle")}</DialogTitle>
              <DialogDescription>{t("totp.scanBody")}</DialogDescription>
            </DialogHeader>
            {enrolment && (
              <form className="flex flex-col gap-4" noValidate onSubmit={(event) => { event.preventDefault(); if (!scanBusy) void finish() }}>
                <div className="flex justify-center">
                  <QrCode
                    value={enrolment.URI}
                    label={t("totp.qrLabel")}
                    className="rounded-md border"
                    fallback={<p className="text-sm text-dim">{t("totp.qrUnavailable")}</p>}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-dim">{t("totp.manual")}</p>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 select-all break-all rounded-md border bg-paper px-3 py-2 font-mono text-sm text-ink">{groupSecret(enrolment.Secret)}</code>
                    <Button type="button" variant="outline" size="sm" aria-label={t("totp.copySecret")} onClick={() => void copySecret()}>
                      <Copy aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totp-code">{t("totp.code")}</Label>
                  <Input
                    ref={codeRef}
                    id="totp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="font-mono tracking-[0.2em]"
                    value={scanCode}
                    disabled={scanBusy}
                    aria-invalid={Boolean(scanCodeError)}
                    aria-describedby={scanCodeError ? "totp-code-error" : undefined}
                    onChange={(e) => { setScanCode(cleanTotpCode(e.target.value)); setScanCodeError(null) }}
                  />
                  {scanCodeError && <p id="totp-code-error" role="alert" className="text-xs font-medium text-destructive">{scanCodeError}</p>}
                </div>
                {scanError && <p role="alert" className="text-sm text-destructive">{scanError}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={scanBusy} onClick={closeScan}>{t("common.cancel")}</Button>
                  <Button type="submit" busy={scanBusy} busyLabel={t("common.busy.checking")} disabled={scanCode.length !== TOTP_DIGITS}>{t("totp.confirm")}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={removeOpen}
          onCancel={closeRemove}
          tone="danger"
          busy={removeBusy}
          busyLabel={t("common.busy.removing")}
          error={removeError}
          title={t("totp.removeTitle")}
          description={lastFactor ? `${t("totp.removeBody")} ${t("totp.removeBodyLast")}` : t("totp.removeBody")}
          confirmLabel={t("totp.removeConfirm")}
          disabled={needsFields && !removeForm.ready}
          onConfirm={() => void remove()}
        >
          {needsFields && <ConfirmFields idPrefix="totp-remove" methods={methods} form={removeForm} hasPassword={account.HasPassword} disabled={removeBusy} />}
        </ConfirmDialog>

        <ConfirmDialog
          open={regenOpen}
          onCancel={closeRegen}
          tone="danger"
          busy={regenBusy}
          busyLabel={t("common.busy.replacing")}
          error={regenError}
          title={t("recoveryCodes.regenerateTitle")}
          description={t("recoveryCodes.regenerateBody")}
          confirmLabel={t("recoveryCodes.regenerateConfirm")}
          disabled={needsFields && !regenForm.ready}
          onConfirm={() => void regenerate()}
        >
          {needsFields && <ConfirmFields idPrefix="codes-regenerate" methods={methods} form={regenForm} hasPassword={account.HasPassword} disabled={regenBusy} />}
        </ConfirmDialog>

        <RecoveryCodesDialog codes={shownCodes} email={account.Email} onDone={() => setShownCodes(null)} />
      </CardContent>
    </Card>
  )
}
