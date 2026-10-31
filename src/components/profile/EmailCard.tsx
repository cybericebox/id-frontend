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
import { FormError, reportFieldOrFormError } from "@/components/ui/form-error"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { apiPost } from "@/api/client"
import { t, tRich } from "@/i18n/t"
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

  const onSubmit: SubmitHandler<EmailValues> = async (data) => {
    if (submittingRef.current || !account.HasPassword || data.Email === account.Email.trim().toLowerCase()) return
    submittingRef.current = true
    setEmailError(null)
    setIsSubmitting(true)
    try {
      await apiPost("/api/auth/account/email", { Email: data.Email, CurrentPassword: data.CurrentPassword })
      const current = form.getValues()
      if (current.Email.trim().toLowerCase() === data.Email && current.CurrentPassword === data.CurrentPassword) {
        form.reset({ Email: "", CurrentPassword: "" })
        try { sessionStorage.removeItem(draftKey) } catch { /* storage may be unavailable */ }
      }
      toast.success(t("profile.account.emailSent"))
    } catch (err) {
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
    </>
  )
}
