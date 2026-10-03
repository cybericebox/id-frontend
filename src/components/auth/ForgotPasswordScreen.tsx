"use client"

import React, { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { executeCaptcha } from "@/lib/captcha"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { MailCheck } from "lucide-react"
import { AuthLayout } from "./AuthLayout"
import { AuthHeading, AuthPane, AuthSwitch } from "./parts"
import { t } from "@/i18n/t"
import { PageLoader } from "@/components/ui/spinner"
import { redirectIfAuthed, rememberReturnTo } from "@/lib/auth"
import { apiPost } from "@/api/client"
import { localizedError } from "@/i18n/apiError"

// ---------------------------------------------------------------------------
// Zod schema — mirrors the daemon's JSON body (Email)
// ---------------------------------------------------------------------------
const ForgotPasswordSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
})

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>

// ---------------------------------------------------------------------------
// Inner component — wrapped in <Suspense> for static-export compatibility.
// useSearchParams reads an optional ?return_to for rememberReturnTo.
// ---------------------------------------------------------------------------
function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to") ?? undefined

  const [checking, setChecking] = useState(true)
  useEffect(() => {
    rememberReturnTo(returnTo)
    let cancelled = false
    redirectIfAuthed(undefined).then((redirecting) => {
      if (!cancelled && !redirecting) setChecking(false)
    }).catch(() => {
      // On any failure (e.g. the /me probe errored), never hang the loader —
      // reveal the form.
      if (!cancelled) setChecking(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onSubmit",
    defaultValues: { Email: "" },
  })

  // Keep return_to on the way back to sign-in.
  const signInHref = returnTo ? `/sign-in?return_to=${encodeURIComponent(returnTo)}` : "/sign-in"

  if (checking) return <PageLoader />

  const onSubmit: SubmitHandler<ForgotPasswordValues> = async (data) => {
    setIsSubmitting(true)

    try {
      // The bot check is mandatory on the backend. Always obtain a token (provider none yields a fixed one).
      let recaptchaToken: string | undefined
      try {
        recaptchaToken = await executeCaptcha("forgotPassword")
      } catch {
        recaptchaToken = undefined
      }

      const body: Record<string, string> = {
        Email: data.Email,
      }
      if (recaptchaToken) {
        body.RecaptchaToken = recaptchaToken
      }

      // required:false — surface a 4xx (e.g. reCAPTCHA failure) inline. The daemon
      // otherwise ALWAYS returns success without revealing whether the account
      // exists, so a 2xx is a neutral confirmation, NOT proof the email is registered.
      await apiPost("/api/auth/password/reset-request", body, undefined, { required: false })
      setSubmitted(true)
      toast.success(t("forgotPassword.checkEmailTitle"))
      return
    } catch (err) {
      toast.error(localizedError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Success state: neutral confirmation — does NOT confirm the account exists.
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <AuthLayout reversed={true} variant="recover">
        <AuthPane>
          <MailCheck size={32} className="text-action" aria-hidden />
          <AuthHeading title={t("forgotPassword.checkEmailTitle")} subtitle={t("forgotPassword.checkEmailBody")} />
          <AuthSwitch href={signInHref} action={t("forgotPassword.backToSignIn")} />
        </AuthPane>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout reversed={true} variant="recover">
      <AuthPane>
        <AuthHeading title={t("forgotPassword.title")} subtitle={t("forgotPassword.subtitle")} />


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
                    <FormLabel>{t("common.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("forgotPassword.emailPlaceholder")}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                busy={isSubmitting}
              >
                {t("forgotPassword.submit")}
              </Button>
            </form>
          </Form>

        <AuthSwitch href={signInHref} action={t("forgotPassword.backToSignIn")} />
      </AuthPane>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps the form in Suspense for static-export consistency
// with the other auth pages.
// ---------------------------------------------------------------------------
export function ForgotPasswordScreen() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
