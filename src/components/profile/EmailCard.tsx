"use client"

import React, { useState, useEffect, useRef } from "react"
import { useForm, useWatch, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormError, reportFieldOrFormError, fieldErrorMessage } from "@/components/ui/form-error"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { apiPost } from "@/api/client"
import { t, tRich } from "@/i18n/t"
import { executeCaptcha } from "@/lib/captcha"
import { localizedError } from "@/i18n/apiError"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ReauthPasswordField } from "./ReauthPasswordField"
import { ResendMail, CaptchaError } from "@/components/auth/ResendMail"
import type { Account } from "./types"
import { accountEmailDraftKey } from "@/lib/storageKeys"


// The account password re-confirms the change; the draft keeps the address only.
const EmailSchema = z.object({
  Email: z.string().trim().toLowerCase().email({ message: t("validation.invalidEmail") }),
  CurrentPassword: z.string().min(1, { message: t("validation.required") }),
})
type EmailValues = z.infer<typeof EmailSchema>

export function EmailCard({ account }: { account: Account }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  const draftKey = accountEmailDraftKey(account.ID)

  const form = useForm<EmailValues>({
    resolver: zodResolver(EmailSchema),
    mode: "onTouched",
    defaultValues: { Email: "", CurrentPassword: "" },
  })
  const email = (useWatch({ control: form.control, name: "Email" }) ?? "").trim().toLowerCase()
  const emailChanged = Boolean(email) && email !== account.Email.trim().toLowerCase()

  // Draft persistence: restore on mount, persist edits continuously so the new
  // email survives an auth redirect (client auto-redirects on 401). Cleared on send.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey)
      // keepDefaultValues: the restored address counts as a change, so «Змінити пошту» stays enabled
      if (raw) form.reset({ Email: (JSON.parse(raw) as { Email?: string }).Email ?? "", CurrentPassword: "" }, { keepDefaultValues: true })
    } catch {
      /* ignore */
    }
    const sub = form.watch((values) => {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify({ Email: values.Email ?? "" }))
      } catch {
        /* ignore */
      }
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  // The change mail; the same request again is «Надіслати ще раз» (the backend limits the pace and asks the bot check).
  const sendChange = async (newEmail: string, password: string) => {
    let recaptchaToken: string | undefined
    try {
      recaptchaToken = await executeCaptcha("emailChange")
    } catch {
      throw new CaptchaError(t("error.captcha"))
    }
    await apiPost("/api/auth/account/email", { Email: newEmail, CurrentPassword: password, ...(recaptchaToken ? { RecaptchaToken: recaptchaToken } : {}) })
  }

  // The address the last link went to, kept in memory with the password that confirmed it: resend repeats the request.
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null)
  const changeAddress = () => {
    if (pending) form.setValue("Email", pending.email, { shouldDirty: true })
    setPending(null)
    window.setTimeout(() => form.setFocus("Email"), 0)
  }

  // «Не підтверджено» without a request of this visit: resend asks for the password first.
  const [resendOpen, setResendOpen] = useState(false)
  const [resendPassword, setResendPassword] = useState("")
  const [resendBusy, setResendBusy] = useState(false)
  const [resendError, setResendError] = useState("")
  const [resendPasswordError, setResendPasswordError] = useState<string | null>(null)
  const resendUnconfirmed = async () => {
    setResendBusy(true)
    setResendError("")
    setResendPasswordError(null)
    try {
      await sendChange(account.Email, resendPassword)
      setPending({ email: account.Email, password: resendPassword })
      setResendOpen(false)
      toast.success(t("mail.resent"))
    } catch (err) {
      const passwordError = fieldErrorMessage(err, [20410])
      if (passwordError) setResendPasswordError(passwordError)
      else setResendError(err instanceof CaptchaError ? err.message : localizedError(err))
    } finally {
      setResendBusy(false)
    }
  }

  const onSubmit: SubmitHandler<EmailValues> = async (data) => {
    if (submittingRef.current || !account.HasPassword || data.Email === account.Email.trim().toLowerCase()) return
    submittingRef.current = true
    setEmailError(null)
    setIsSubmitting(true)
    try {
      await sendChange(data.Email, data.CurrentPassword)
      setPending({ email: data.Email, password: data.CurrentPassword })
      const current = form.getValues()
      if (current.Email.trim().toLowerCase() === data.Email && current.CurrentPassword === data.CurrentPassword) {
        form.reset({ Email: "", CurrentPassword: "" })
        try { sessionStorage.removeItem(draftKey) } catch { /* storage may be unavailable */ }
      }
      toast.success(t("profile.account.emailSent"))
    } catch (err) {
      if (err instanceof CaptchaError) { setEmailError(err.message); return }
      reportFieldOrFormError(err, setEmailError, form.setError, { 20426: "Email", 20302: "Email", 20410: "CurrentPassword" })
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.account.title")}</CardTitle>
          <CardDescription>{t("profile.account.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-dim">
              {tRich("profile.account.currentEmailLine", {
                email: <span className="font-medium text-ink">{account.Email}</span>,
                status: (
                  <span className={account.EmailConfirmed ? "text-ok" : "text-warn"}>
                    {t("profile.account.statusParen", {
                      status: account.EmailConfirmed ? t("profile.account.confirmed") : t("profile.account.unconfirmed"),
                    })}
                  </span>
                ),
              })}
            </span>
          </div>


          {pending ? (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm">{t("profile.account.linkSentTo", { email: pending.email })}</p>
              <ResendMail resend={() => sendChange(pending.email, pending.password)} onChangeAddress={changeAddress} />
            </div>
          ) : !account.EmailConfirmed && account.HasPassword ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => { setResendError(""); setResendPasswordError(null); setResendPassword(""); setResendOpen(true) }}>
                {t("mail.resend")}
              </Button>
              <Button type="button" variant="ghost" onClick={changeAddress}>{t("mail.changeAddress")}</Button>
            </div>
          ) : null}

          {!account.HasPassword && (
            <Alert variant="warn">
              <AlertDescription>{t("profile.account.emailNeedsPassword")}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="Email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.account.newEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("common.emailPlaceholder")}
                        autoComplete="email"
                        disabled={!account.HasPassword}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {account.HasPassword && (
                <FormField
                  control={form.control}
                  name="CurrentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.security.currentPassword")}</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {account.Providers.includes("google") && (
                <p className="text-sm text-dim">{t("profile.account.emailGoogleNote")}</p>
              )}
              <FormError message={emailError} />
              <div className="flex min-h-10 flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={!emailChanged || !account.HasPassword}
                  busy={isSubmitting}
                  busyLabel={t("common.busy.sending")}
                >
                  {t("profile.account.changeEmail")}
                </Button>
                {form.formState.isDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => form.reset()}
                  >
                    {t("common.reset")}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resendOpen}
        onCancel={() => setResendOpen(false)}
        busy={resendBusy}
        busyLabel={t("common.busy.sending")}
        disabled={!resendPassword}
        error={resendError}
        title={t("profile.account.resendTitle")}
        description={t("profile.account.resendBody", { email: account.Email })}
        confirmLabel={t("mail.resend")}
        onConfirm={() => void resendUnconfirmed()}
      >
        <ReauthPasswordField
          id="resend-email-password"
          hint={t("profile.account.resendPasswordHint")}
          value={resendPassword}
          error={resendPasswordError}
          onChange={(value) => { setResendPassword(value); setResendPasswordError(null) }}
          disabled={resendBusy}
        />
      </ConfirmDialog>
    </>
  )
}
