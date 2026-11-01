"use client"

import React, { useState } from "react"
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
import { forgetUrlToken, useUrlToken } from "@/lib/useUrlToken"
import { useUrlParams } from "@/lib/useUrlParams"
import { safeReturnTo } from "@/lib/auth"
import { localizedError } from "@/i18n/apiError"
import { t } from "@/i18n/t"
import { confirmGoogleWithCode, confirmGoogleWithPassword, sendGoogleConfirmCode } from "@/api/googleConfirm"

const WRONG_PASSWORD = 20410
// TODO(contract): the backend's code for a wrong or expired mailed code.
const WRONG_CODE: number[] = []

type Mode = "password" | "code"

// «Підтвердіть, що це ваш обліковий запис»: Google found an account of this address that is not linked to Google yet.
// The owner proves it with the account password or a code mailed to the address; then Google is linked and the user
// is signed in. Accounts without a password (passkey only, Google-less) can use the code only.
export function GoogleConfirmScreen() {
  const params = useUrlParams()
  const ticket = useUrlToken(params) ?? ""
  // TODO(contract): whether the account has a password comes from the backend; until then a ?password=0 marks «code only».
  const hasPassword = params?.get("password") !== "0"
  const returnTo = params?.get("return_to") ?? undefined

  const [mode, setMode] = useState<Mode>(hasPassword ? "password" : "code")
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
    forgetUrlToken()
    // The button stays busy while the browser navigates.
    window.location.assign(redirectUrl || safeReturnTo(returnTo))
  }

  const sendCode = async (): Promise<number | void> => {
    let token: string | undefined
    try {
      token = await executeCaptcha("googleConfirm")
    } catch {
      throw new CaptchaError(t("error.captcha"))
    }
    return sendGoogleConfirmCode(ticket, token ?? "")
  }

  const startCode = async () => {
    setFormError(null)
    setFieldError(null)
    setSending(true)
    try {
      await sendCode()
      setCodeSent(true)
      setMode("code")
    } catch (err) {
      setFormError(err instanceof CaptchaError ? err.message : localizedError(err))
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
      const { RedirectURL } = effectiveMode === "password"
        ? await confirmGoogleWithPassword(ticket, password)
        : await confirmGoogleWithCode(ticket, code.trim())
      finish(RedirectURL)
    } catch (err) {
      const message = fieldErrorMessage(err, effectiveMode === "password" ? [WRONG_PASSWORD] : WRONG_CODE)
      if (message) setFieldError(message)
      else setFormError(localizedError(err))
      setBusy(false)
    }
  }

  if (params !== null && !ticket) {
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

  const fieldId = effectiveMode === "password" ? "google-confirm-password" : "google-confirm-code"
  return (
    <AuthLayout reversed={false} variant="signin">
      <AuthPane>
        <AuthHeading
          title={t("googleConfirm.title")}
          subtitle={effectiveMode === "password" ? t("googleConfirm.passwordSubtitle") : t("googleConfirm.codeSubtitle")}
        />
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
            initialSeconds={codeSent ? undefined : 0}
            resendLabel={codeSent ? t("googleConfirm.resendCode") : t("googleConfirm.sendCode")}
            resendInLabel={(seconds) => t("googleConfirm.resendCodeIn", { seconds })}
          />
        ) : null}
        {effectiveMode === "code" && hasPassword && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => { setMode("password"); setFieldError(null); setFormError(null) }}>
            {t("googleConfirm.usePassword")}
          </Button>
        )}
        <AuthSwitch href={signInHref} action={t("forgotPassword.backToSignIn")} />
      </AuthPane>
    </AuthLayout>
  )
}
