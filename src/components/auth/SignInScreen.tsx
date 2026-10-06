"use client"

import React, { useState } from "react"
import Link from "next/link"
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
import { PasswordInput } from "@/components/ui/password-input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormError, reportFormError } from "@/components/ui/form-error"
import { AuthLayout } from "./AuthLayout"
import { useOneShotParam } from "@/lib/useOneShotParam"
import { useUrlParams } from "@/lib/useUrlParams"
import { useGuestOnly } from "@/lib/useGuestOnly"
import { AuthDivider, AuthHeading, AuthPane, AuthSwitch, GoogleIcon, authLinkClass } from "./parts"
import { t } from "@/i18n/t"
import { safeReturnTo } from "@/lib/auth"
import { apiPost, apiUrl } from "@/api/client"

// ---------------------------------------------------------------------------
// Zod schema — mirrors the daemon's JSON body (Email, Password)
// ---------------------------------------------------------------------------
const SignInSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
  Password: z.string().min(1, { message: t("validation.required") }),
})

type SignInValues = z.infer<typeof SignInSchema>

// ---------------------------------------------------------------------------
// The form renders at once (heading and fields are in the static HTML); the return_to and Google flag come from the
// URL on the client, and a signed-in visitor is redirected when `/me` answers.
// ---------------------------------------------------------------------------
export function SignInScreen() {
  const params = useUrlParams()
  const returnTo = params?.get("return_to") ?? ""
  useGuestOnly(params !== null, returnTo || undefined)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)

  const [googleError, clearGoogleError] = useOneShotParam("google_error", params)

  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    mode: "onSubmit",
    defaultValues: { Email: "", Password: "" },
  })

  const onSubmit: SubmitHandler<SignInValues> = async (data) => {
    clearGoogleError()
    setFormError(null)
    setIsSubmitting(true)

    try {
      // The bot check is mandatory on the backend. Always obtain a token (provider none yields a fixed one).
      let recaptchaToken: string | undefined
      try {
        recaptchaToken = await executeCaptcha("signIn")
      } catch {
        setFormError(t("error.captcha"))
        return
      }

      const body: Record<string, string> = {
        Email: data.Email,
        Password: data.Password,
      }
      if (recaptchaToken) {
        body.RecaptchaToken = recaptchaToken
      }
      // Post-login target. The backend validates it (IsTrustedRedirect) and
      // falls back to id/profile when it is missing or untrusted.
      if (returnTo) {
        body.Redirect = returnTo
      }

      // The backend returns 200 JSON { Status, Data: { RedirectURL } }.
      // apiPost unwraps the envelope and throws ApiError on 4xx.
      // We perform a top-level navigation to RedirectURL.
      // required:false — a 401 here means "credentials rejected", which must be
      // shown inline. Without it the client would treat the 401 as "not signed
      // in" and redirect to this very page, swallowing the error.
      const { RedirectURL } = await apiPost<{ RedirectURL: string }>(
        "/api/auth/sign-in",
        body,
        undefined,
        { required: false }
      )

      if (RedirectURL) {
        window.location.assign(RedirectURL)
      } else {
        window.location.assign(safeReturnTo(returnTo || undefined))
      }
    } catch (err) {
      // Localized by the error's stable code (Status.Code), not the English message.
      reportFormError(err, setFormError)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build /sign-up link preserving return_to if present
  const registerHref = returnTo
    ? `/sign-up?return_to=${encodeURIComponent(returnTo)}`
    : "/sign-up"

  return (
    <AuthLayout reversed={false} variant="signin">
      <AuthPane>
        <AuthHeading title={t("signIn.title")} subtitle={t("signIn.subtitle")} />

          {/* Google sign-in — plain navigation; the daemon redirects the browser
              to the Google consent page and back to return_to (validated there).
              Errors surface on the callback redirect (?google_error=failed or
              already_registered here, not_registered goes to /sign-up). */}
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              const q = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""
              window.location.href = apiUrl(`/api/auth/google${q}`)
            }}
          >
            <GoogleIcon />
            {t("signIn.continueWithGoogle")}
          </Button>

          <AuthDivider label={t("signIn.orWithEmail")} />


          {googleError === "failed" && (
            <Alert variant="destructive">
              <AlertDescription>{t("signIn.googleFailed")}</AlertDescription>
            </Alert>
          )}

          {/* register-with-Google for an email that already has an account
              (Google not linked yet): sign in, then link Google in the profile */}
          {googleError === "blocked" && (
            <Alert variant="destructive">
              <AlertDescription>{t("signIn.googleBlocked")}</AlertDescription>
            </Alert>
          )}

          {googleError === "already_registered" && (
            <Alert>
              <AlertDescription>{t("signIn.googleAlreadyRegistered")}</AlertDescription>
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
                    <FormLabel>{t("common.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("signIn.emailPlaceholder")}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>{t("common.password")}</FormLabel>
                      <Link href="/forgot-password" className={authLinkClass}>
                        {t("signIn.forgotPassword")}
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput
                        placeholder={t("signIn.passwordPlaceholder")}
                        autoComplete="current-password"
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
                {t("signIn.submit")}
              </Button>
            </form>
          </Form>

        <AuthSwitch text={t("signIn.noAccount")} href={registerHref} action={t("signIn.createAccount")} />
      </AuthPane>
    </AuthLayout>
  )
}
