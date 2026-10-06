"use client"

import React, { useState } from "react"
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
import { FormError, reportFormError } from "@/components/ui/form-error"
import { useUrlParams } from "@/lib/useUrlParams"
import { useGuestOnly } from "@/lib/useGuestOnly"
import { MailCheck } from "lucide-react"
import { AuthLayout } from "./AuthLayout"
import { AuthHeading, AuthPane, AuthSwitch } from "./parts"
import { t } from "@/i18n/t"
import { apiPost } from "@/api/client"

// ---------------------------------------------------------------------------
// Zod schema — mirrors the daemon's JSON body (Email)
// ---------------------------------------------------------------------------
const ForgotPasswordSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
})

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>

// ---------------------------------------------------------------------------
// The form renders at once; an optional ?return_to comes from the URL on the client.
// ---------------------------------------------------------------------------
export function ForgotPasswordScreen() {
  const params = useUrlParams()
  const returnTo = params?.get("return_to") ?? undefined
  useGuestOnly(params !== null, returnTo, undefined)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { Email: "" },
  })

  // Keep return_to on the way back to sign-in.
  const signInHref = returnTo ? `/sign-in?return_to=${encodeURIComponent(returnTo)}` : "/sign-in"

  const onSubmit: SubmitHandler<ForgotPasswordValues> = async (data) => {
    setFormError(null)
    setIsSubmitting(true)

    try {
      // The bot check is mandatory on the backend. Always obtain a token (provider none yields a fixed one).
      let recaptchaToken: string | undefined
      try {
        recaptchaToken = await executeCaptcha("forgotPassword")
      } catch {
        setFormError(t("error.captcha"))
        return
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
      return
    } catch (err) {
      reportFormError(err, setFormError)
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

              <FormError message={formError} />

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
