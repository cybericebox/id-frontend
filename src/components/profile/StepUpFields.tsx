"use client"

import React, { useState } from "react"

import { ApiError } from "@/api/client"
import {
  STEP_UP_FAILED,
  TOTP_CODE_USED,
  TOTP_INVALID_CODE,
  WRONG_PASSWORD,
  stepUp,
  type ConfirmMethod,
} from "@/api/secondFactor"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { localizedError } from "@/i18n/apiError"
import { t } from "@/i18n/t"
import { isPasskeyDismissed } from "@/lib/passkey"
import { cleanTotpCode, TOTP_DIGITS } from "@/lib/stepUp"
import { ReauthPasswordField } from "./ReauthPasswordField"

// Codes that belong to the code or password field; everything else stays on the form.
const CODE_FIELD_ERRORS = [STEP_UP_FAILED, TOTP_CODE_USED, TOTP_INVALID_CODE]

/** Where a failed confirmation is shown: beside its field, or on the form (dialog). */
export function confirmErrorPlace(err: unknown, method: ConfirmMethod): { field?: string; form?: string } {
  if (isPasskeyDismissed(err)) return { form: t("stepUp.passkeyCancelled") }
  if (err instanceof ApiError && err.status < 500 && err.code != null) {
    if (method === "totp" && CODE_FIELD_ERRORS.includes(err.code)) return { field: localizedError(err) }
    if (method === "password" && err.code === WRONG_PASSWORD) return { field: localizedError(err) }
  }
  return { form: localizedError(err) }
}

/**
 * The state of one confirmation: the chosen method and what was typed for it. `ready` says whether it can be sent;
 * `confirm` sends it (POST /api/auth/step-up) and throws what the backend answered.
 */
export function useConfirmForm(methods: readonly ConfirmMethod[], hasPassword: boolean) {
  const [chosen, setChosen] = useState<ConfirmMethod | null>(null)
  const method: ConfirmMethod | null = chosen && methods.includes(chosen) ? chosen : methods[0] ?? null
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)

  const ready = method === "passkey"
    || (method === "totp" && code.length === TOTP_DIGITS)
    || (method === "password" && (!hasPassword || password !== ""))

  return {
    method,
    setMethod: (m: ConfirmMethod) => { setChosen(m); setFieldError(null) },
    code,
    updateCode: (v: string) => { setCode(cleanTotpCode(v)); setFieldError(null) },
    password,
    updatePassword: (v: string) => { setPassword(v); setFieldError(null) },
    fieldError,
    setFieldError,
    ready,
    reset: () => { setChosen(null); setCode(""); setPassword(""); setFieldError(null) },
    confirm: () => (method ? stepUp(method, { code, password }) : Promise.reject(new Error("no confirmation method"))),
  }
}

export type ConfirmForm = ReturnType<typeof useConfirmForm>

const METHOD_LABEL: Record<ConfirmMethod, string> = {
  totp: "stepUp.method.totp",
  passkey: "stepUp.method.passkey",
  password: "common.password",
}

/**
 * The fields of a confirmation (a dialog or the step-up page): a one-of-many choice when the account has several
 * factors, then the authenticator code, the passkey prompt or the password. Errors render beside their field.
 */
export function ConfirmFields({ idPrefix, methods, form, hasPassword, disabled }: {
  idPrefix: string
  methods: readonly ConfirmMethod[]
  form: ConfirmForm
  hasPassword: boolean
  disabled?: boolean
}) {
  if (methods.length === 0) return <p className="text-sm text-dim">{t("stepUp.noMethod")}</p>
  const { method } = form
  const codeId = `${idPrefix}-code`
  const codeErrorId = `${codeId}-error`
  return (
    <div className="space-y-3">
      {method !== "password" && <p className="text-sm text-dim">{t("stepUp.factorHint")}</p>}
      {methods.length > 1 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-ink">{t("stepUp.methods")}</legend>
          {methods.map((m) => (
            <label key={m} className="flex min-h-9 cursor-pointer items-start gap-2 pointer-coarse:min-h-11">
              <input
                type="radio"
                name={`${idPrefix}-method`}
                value={m}
                checked={method === m}
                disabled={disabled}
                onChange={() => form.setMethod(m)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-action pointer-coarse:size-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action"
              />
              <span className="text-sm leading-snug text-body">{t(METHOD_LABEL[m])}</span>
            </label>
          ))}
        </fieldset>
      )}
      {method === "totp" && (
        <div className="space-y-2">
          <Label htmlFor={codeId}>{t("totp.code")}</Label>
          <Input
            id={codeId}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="font-mono tracking-[0.2em]"
            value={form.code}
            disabled={disabled}
            aria-invalid={Boolean(form.fieldError)}
            aria-describedby={form.fieldError ? codeErrorId : undefined}
            onChange={(e) => form.updateCode(e.target.value)}
          />
          {form.fieldError && <p id={codeErrorId} role="alert" className="text-xs font-medium text-destructive">{form.fieldError}</p>}
        </div>
      )}
      {/* a passkey has no field: its errors stay on the form */}
      {method === "passkey" && <p className="text-sm text-dim">{t("stepUp.passkeyHint")}</p>}
      {method === "password" && (hasPassword ? (
        <ReauthPasswordField
          id={`${idPrefix}-password`}
          hint={t("stepUp.passwordHint")}
          value={form.password}
          error={form.fieldError}
          disabled={disabled}
          onChange={form.updatePassword}
        />
      ) : (
        <p className="text-sm text-dim">{t("stepUp.recentSignInHint")}</p>
      ))}
    </div>
  )
}
