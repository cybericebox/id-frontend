"use client"

import React, { useEffect, useState } from "react"
import { LinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { FormError, fieldErrorMessage } from "@/components/ui/form-error"
import { AuthLayout } from "./AuthLayout"
import { AuthHeading, AuthPane, AuthSwitch } from "./parts"
import { ResendMail, CaptchaError } from "./ResendMail"
import { executeCaptcha } from "@/lib/captcha"
import { useUrlParams } from "@/lib/useUrlParams"
import { safeReturnTo } from "@/lib/auth"
import { localizedError } from "@/i18n/apiError"
import { t } from "@/i18n/t"
import { LoadingArea } from "@/components/ui/spinner"
import { LoadError } from "@/components/ui/load-error"
import { ApiError } from "@/api/client"
import { confirmGoogle, declineGoogleLink, getPendingGoogleLink, GOOGLE_PENDING_GONE, sendGoogleConfirmCode, type PendingGoogleLink } from "@/api/googleConfirm"
import { setSignedHint } from "@/lib/signedHint"
import { RESEND_COOLDOWN_SECONDS } from "./ResendMail"

const WRONG_PASSWORD = 50401 // ErrAuthInvalidUserCredentials, as in sign-in
const WRONG_CODE = 20437

type Mode = "password" | "code"

// «Підтвердіть, що це ваш обліковий запис»: Google found an account of this address that is not linked to Google yet.
// The owner proves it with the account password or a code mailed to the address; then Google is linked and the user
// is signed in. Accounts without a password (passkey only, Google-less) can use the code only.
export function GoogleConfirmScreen() {
  const params = useUrlParams()
  const returnTo = params?.get("return_to") ?? undefined

  // The pending link sits in an HttpOnly cookie of this browser: the page asks the backend which Google account it is
  // (shown before the form) and whether the account has a password. «none» = no pending link (expired, other browser).
  const [pending, setPending] = useState<PendingGoogleLink | "none" | { error: unknown } | null>(null)
  const load = () => {
    setPending(null)
    getPendingGoogleLink().then((data) => {
      setPending(data)
      // a code was already mailed: go straight to the code field, with the wait that is left
      if (data.CodeSentAt) { setMode("code"); setCodeSent(true); setCodeWait(waitLeft(data.CodeSentAt)) }
    }).catch((err: unknown) => {
      setPending(err instanceof ApiError && err.status >= 400 && err.status < 500 ? "none" : { error: err })
    })
  }
  // eslint-disable-next-line @eslint-react/exhaustive-deps
  useEffect(load, [])
  const [codeWait, setCodeWait] = useState(RESEND_COOLDOWN_SECONDS)
  const link = pending !== null && pending !== "none" && !("error" in pending) ? pending : null
  const hasPassword = link?.HasPassword ?? false

  const [mode, setMode] = useState<Mode>("password")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  const effectiveMode: Mode = hasPassword ? mode : "code"
  const signInHref = `/sign-in${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`

  const finish = (redirectUrl: string) => {
    // The button stays busy while the browser navigates.
    window.location.assign(redirectUrl || safeReturnTo(returnTo))
  }

  // The bot check is mandatory (like every mail request); the backend also limits the pace (60 s between mails, 5 an hour).
  const sendCode = async (): Promise<number | void> => {
    let token: string
    try {
      token = await executeCaptcha("googleLinkCode")
    } catch {
      throw new CaptchaError(t("error.captcha"))
    }
    return sendGoogleConfirmCode(token)
  }

  // The ticket is gone (expired, used, other browser): the page says so instead of failing field by field.
  const gone = (err: unknown) => err instanceof ApiError && (err.code === GOOGLE_PENDING_GONE || err.status === 404)

  const startCode = async () => {
    setFormError(null)
    setFieldError(null)
    setSending(true)
    try {
      await sendCode()
      setCodeSent(true)
      setMode("code")
    } catch (err) {
      if (gone(err)) setPending("none")
      else setFormError(err instanceof CaptchaError ? err.message : localizedError(err))
    } finally {
      setSending(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setFormError(null)
    setFieldError(null)
    if (effectiveMode === "password" && !password) { setFieldError(t("validation.required")); return }
    if (effectiveMode === "code" && !code.trim()) { setFieldError(t("validation.required")); return }
    setBusy(true)
    try {
      const { RedirectURL } = await confirmGoogle(effectiveMode === "password" ? { Password: password } : { Code: code.trim() })
      setSignedHint()
      finish(RedirectURL)
    } catch (err) {
      if (gone(err)) { setPending("none"); setBusy(false); return }
      const message = fieldErrorMessage(err, effectiveMode === "password" ? [WRONG_PASSWORD] : [WRONG_CODE])
      if (message) setFieldError(message)
      else setFormError(localizedError(err))
      setBusy(false)
    }
  }

  if (pending === null || (typeof pending === "object" && "error" in pending)) {
    return (
      <AuthLayout reversed={false} variant="signin">
        <AuthPane>
          {pending === null
            ? <LoadingArea label={t("common.loading")} />
            : <LoadError message={t("googleConfirm.loadError")} error={pending.error} onRetry={load} />}
        </AuthPane>
      </AuthLayout>
    )
  }

  if (pending === "none") {
    return (
      <AuthLayout reversed={false} variant="signin">
        <AuthPane>
          <LinkIcon size={32} className="text-danger" aria-hidden />
          <AuthHeading title={t("googleConfirm.missingTitle")} subtitle={t("googleConfirm.missingBody")} />
          <AuthSwitch href={signInHref} action={t("forgotPassword.backToSignIn")} />
        </AuthPane>
      </AuthLayout>
    )
  }

  // «Це не я»: the link was not started by the owner; drop it and go to sign-in.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A full load drops the pending client state.
  const notMe = () => { void declineGoogleLink().catch(() => {}).finally(() => window.location.assign(signInHref)) }

  const fieldId = effectiveMode === "password" ? "google-confirm-password" : "google-confirm-code"
  return (
    <AuthLayout reversed={false} variant="signin">
      <AuthPane>
        <AuthHeading
          title={t("googleConfirm.title")}
          subtitle={effectiveMode === "password" ? t("googleConfirm.passwordSubtitle") : t("googleConfirm.codeSubtitle")}
        />
        {link && (
          <p className="rounded-md border border-line bg-soft p-3 text-sm">
            <span className="block text-xs text-dim">{t("googleConfirm.linking")}</span>
            <span className="block break-words font-medium">{link.GoogleName ? `${link.GoogleName} · ${link.GoogleEmail}` : link.GoogleEmail}</span>
            <span className="mt-2 block text-xs text-dim">{t("googleConfirm.toAccount")}</span>
            <span className="block break-words font-medium">{link.Email}</span>
          </p>
        )}
        <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{effectiveMode === "password" ? t("common.password") : t("googleConfirm.code")}</Label>
            {effectiveMode === "password" ? (
              <PasswordInput
                id={fieldId}
                autoComplete="current-password"
                value={password}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? `${fieldId}-error` : undefined}
                disabled={busy}
                onChange={(e) => { setPassword(e.target.value); setFieldError(null) }}
              />
            ) : (
              <Input
                id={fieldId}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? `${fieldId}-error` : undefined}
                disabled={busy}
                onChange={(e) => { setCode(e.target.value); setFieldError(null) }}
              />
            )}
            {fieldError && <p id={`${fieldId}-error`} role="alert" className="text-xs font-medium text-destructive">{fieldError}</p>}
          </div>
          <FormError message={formError} />
          <Button type="submit" className="w-full" busy={busy} busyLabel={t("googleConfirm.confirming")}>
            {t("googleConfirm.confirm")}
          </Button>
        </form>

        {effectiveMode === "password" ? (
          <Button type="button" variant="ghost" className="w-full" busy={sending} busyLabel={t("common.busy.sending")} onClick={() => void startCode()}>
            {t("googleConfirm.sendCode")}
          </Button>
        ) : codeSent || !hasPassword ? (
          // the first mail goes out with the button below when the account has no password; later ones are resends
          <ResendMail
            resend={sendCode}
            initialSeconds={codeSent ? codeWait : 0}
            resendLabel={codeSent ? t("googleConfirm.resendCode") : t("googleConfirm.sendCode")}
            resendInLabel={(seconds) => t("googleConfirm.resendCodeIn", { seconds })}
          />
        ) : null}
        {effectiveMode === "code" && hasPassword && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode("password"); setFieldError(null); setFormError(null) }}>
            {t("googleConfirm.usePassword")}
          </Button>
        )}
        <p className="text-center text-xs text-dim">
          {t("googleConfirm.notMe")}{" "}
          <button type="button" className="ib-tap rounded-xs font-medium text-action underline decoration-current/45 decoration-1 underline-offset-3 hover:decoration-current" onClick={notMe}>
            {t("googleConfirm.notMeAction")}
          </button>
        </p>
        <AuthSwitch href={signInHref} action={t("forgotPassword.backToSignIn")} />
      </AuthPane>
    </AuthLayout>
  )
}

// Seconds left of the 60 s pause after the last mailed code.
function waitLeft(sentAt: string): number {
  const elapsed = (Date.now() - new Date(sentAt).getTime()) / 1000
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed))
}
