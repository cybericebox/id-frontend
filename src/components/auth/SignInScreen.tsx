"use client"

import React, { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useReCaptcha } from "next-recaptcha-v3"

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
import { toast } from "@/components/ui/toast"
import { AuthLayout } from "./AuthLayout"
import { useOneShotParam } from "@/lib/useOneShotParam"
import { AuthDivider, AuthHeading, AuthPane, AuthSwitch, GoogleIcon, authLinkClass } from "./parts"
import { t } from "@/i18n/t"
import { PageLoader } from "@/components/ui/spinner"
import { redirectIfAuthed, rememberReturnTo, safeReturnTo } from "@/lib/auth"
import { apiPost, apiUrl } from "@/api/client"
import { localizedError } from "@/i18n/apiError"
import { onServiceRestored } from "@/lib/serviceStatus"

// ---------------------------------------------------------------------------
// Zod schema — mirrors the daemon's JSON body (Email, Password)
// ---------------------------------------------------------------------------
const SignInSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
  Password: z.string().min(1, { message: t("validation.required") }),
})

type SignInValues = z.infer<typeof SignInSchema>

// ---------------------------------------------------------------------------
// Inner component — must be wrapped in <Suspense> because useSearchParams()
// opts out of static prerendering (required for `output: 'export'`).
// ---------------------------------------------------------------------------
function SignInForm() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to") ?? ""

  const [checking, setChecking] = useState(true)
  useEffect(() => {
    rememberReturnTo(returnTo || undefined)
    let cancelled = false
    const checkSession = () => {
      void redirectIfAuthed(returnTo || undefined).then((redirecting) => {
        if (!cancelled && !redirecting) setChecking(false)
      }).catch(() => {
        // Keep the form available under the service notice while the API is down.
        if (!cancelled) setChecking(false)
      })
    }
    checkSession()
    const unsubscribe = onServiceRestored(checkSession)
    return () => { cancelled = true; unsubscribe() }
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  const { executeRecaptcha } = useReCaptcha()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [googleError, clearGoogleError] = useOneShotParam("google_error", searchParams.get("google_error"))

  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    mode: "onSubmit",
    defaultValues: { Email: "", Password: "" },
  })

  if (checking) return <PageLoader />

  const onSubmit: SubmitHandler<SignInValues> = async (data) => {
    clearGoogleError()
    setIsSubmitting(true)

    try {
      // reCAPTCHA is mandatory on the backend. Always obtain a token; the provider
      // only loads the script when NEXT_PUBLIC_RECAPTCHA_SITE_KEY is configured.
      let recaptchaToken: string | undefined
      try {
        recaptchaToken = await executeRecaptcha("signIn")
      } catch {
        recaptchaToken = undefined
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
      toast.error(localizedError(err))
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

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("signIn.inProgress") : t("signIn.submit")}
              </Button>
            </form>
          </Form>

        <AuthSwitch text={t("signIn.noAccount")} href={registerHref} action={t("signIn.createAccount")} />
      </AuthPane>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps the form in Suspense to satisfy `output: 'export'`
// static prerendering when useSearchParams is used inside.
// ---------------------------------------------------------------------------
export function SignInScreen() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
