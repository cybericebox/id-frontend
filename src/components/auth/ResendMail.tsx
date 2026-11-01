"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { FormError } from "@/components/ui/form-error"
import { ApiError } from "@/api/client"
import { localizedError } from "@/i18n/apiError"
import { t } from "@/i18n/t"
import { toast } from "@/components/ui/toast"

/** One mail per address per this many seconds (the backend enforces it too; this is only the first countdown). */
export const RESEND_COOLDOWN_SECONDS = 60

/** The bot check failed before the request: its (already localized) message is shown as it is. */
export class CaptchaError extends Error {}

/**
 * The seconds the backend asks to wait: its RetryAfterSeconds in the error body (Status.Context), else the Retry-After header.
 * Undefined when the refusal carries no wait.
 */
export function retryAfterSeconds(err: unknown): number | undefined {
  if (!(err instanceof ApiError)) return undefined
  const body = err.body as { Data?: { RetryAfterSeconds?: unknown }; Status?: { RetryAfterSeconds?: unknown; Context?: { RetryAfterSeconds?: unknown } }; RetryAfterSeconds?: unknown } | null
  const fromBody = body?.Status?.Context?.RetryAfterSeconds ?? body?.Data?.RetryAfterSeconds ?? body?.Status?.RetryAfterSeconds ?? body?.RetryAfterSeconds
  const seconds = typeof fromBody === "number" ? fromBody : err.retryAfter
  return typeof seconds === "number" && seconds > 0 ? Math.ceil(seconds) : undefined
}

/**
 * «Надіслати ще раз» with a countdown, and «Змінити адресу», for every «Перевірте пошту» state. The button is
 * disabled while the countdown runs and says how long is left; a refusal from the backend (too soon, too many per hour)
 * restarts the countdown with the seconds it asks for. `resend` sends the mail again and may return the next wait.
 */
export function ResendMail({
  resend,
  onChangeAddress,
  resendLabel = t("mail.resend"),
  resendInLabel = (seconds: number) => t("mail.resendIn", { seconds }),
  changeAddressLabel = t("mail.changeAddress"),
  initialSeconds = RESEND_COOLDOWN_SECONDS,
}: {
  resend: () => Promise<number | void>
  onChangeAddress?: () => void
  changeAddressLabel?: string
  resendLabel?: string
  resendInLabel?: (seconds: number) => string
  initialSeconds?: number
}) {
  const [until, setUntil] = useState(() => Date.now() + initialSeconds * 1000)
  const [left, setLeft] = useState(initialSeconds)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [until])

  const send = useCallback(async () => {
    if (sendingRef.current) return
    sendingRef.current = true
    setBusy(true)
    setError(null)
    try {
      const next = await resend()
      setUntil(Date.now() + (typeof next === "number" && next > 0 ? next : RESEND_COOLDOWN_SECONDS) * 1000)
      toast.success(t("mail.resent"))
    } catch (err) {
      const wait = retryAfterSeconds(err)
      if (wait) setUntil(Date.now() + wait * 1000)
      setError(err instanceof CaptchaError ? err.message : localizedError(err))
    } finally {
      sendingRef.current = false
      setBusy(false)
    }
  }, [resend])

  const waiting = left > 0
  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={waiting}
          busy={busy}
          busyLabel={t("common.busy.sending")}
          onClick={() => void send()}
        >
          {waiting ? resendInLabel(left) : resendLabel}
        </Button>
        {onChangeAddress && (
          <Button type="button" variant="ghost" disabled={busy} onClick={onChangeAddress}>
            {changeAddressLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
