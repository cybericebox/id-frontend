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
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/toast"
import { CircleAlert, MailCheck } from "lucide-react"
import { AuthLayout } from "./AuthLayout"
import { useOneShotParam } from "@/lib/useOneShotParam"
import { AuthDivider, AuthHeading, AuthPane, AuthSwitch, GoogleIcon } from "./parts"
import { t } from "@/i18n/t"
import { PageLoader } from "@/components/ui/spinner"
import { redirectIfAuthed, rememberReturnTo } from "@/lib/auth"
import { apiPost, apiUrl } from "@/api/client"
import { localizedError } from "@/i18n/apiError"
import { onServiceRestored } from "@/lib/serviceStatus"

// ---------------------------------------------------------------------------
// Zod schema — mirrors the daemon's JSON body (Email only for registration)
// ---------------------------------------------------------------------------
const RegisterSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
})

type RegisterValues = z.infer<typeof RegisterSchema>

// Puts the address into the copy as one unbreakable, emphasised token.
function withEmail(template: string, email: string) {
  const [before, after = ""] = template.split("{email}")
  return (
    <>
      {before}
      <b className="whitespace-nowrap font-medium text-ink">{email}</b>
      {after}
    </>
  )
}

// ---------------------------------------------------------------------------
// Inner component — must be wrapped in <Suspense> because useSearchParams()
// opts out of static prerendering (required for `output: 'export'`).
// ---------------------------------------------------------------------------
function RegisterForm() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to") ?? ""
  const [googleError, clearGoogleError] = useOneShotParam("google_error", searchParams.get("google_error"))

  const [checking, setChecking] = useState(true)
  useEffect(() => {
    rememberReturnTo(returnTo || undefined)
    let cancelled = false
    const checkSession = () => {
      void redirectIfAuthed(returnTo || undefined).then((redirecting) => {
        if (!cancelled && !redirecting) setChecking(false)
      }).catch(() => {
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
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    mode: "onBlur",
    defaultValues: { Email: "" },
  })

  if (checking) return <PageLoader />

  const onSubmit: SubmitHandler<RegisterValues> = async (data) => {
    clearGoogleError()
    setIsSubmitting(true)

    try {
      // reCAPTCHA is mandatory on the backend. Always obtain a token; the provider
      // only loads the script when NEXT_PUBLIC_RECAPTCHA_SITE_KEY is configured.
      let recaptchaToken: string | undefined
      try {
        recaptchaToken = await executeRecaptcha("signUp")
      } catch {
        recaptchaToken = undefined
      }

      const body: Record<string, string> = {
        Email: data.Email,
      }
      if (recaptchaToken) {
        body.RecaptchaToken = recaptchaToken
      }
      // Carried into the emailed setup link (backend validates it) so the user
      // lands back where they came from after finishing registration.
      if (returnTo) {
        body.Redirect = returnTo
      }

      // Route through the API client so the request hits api.<domain> (absolute
      // BASE_URL) with credentials — NOT a relative "/api/..." that would resolve
      // against the id.<domain> frontend origin and 404. required:false keeps a
      // 401 as a thrown ApiError instead of a sign-in redirect (sign-up is anon).
      await apiPost("/api/auth/sign-up", body, undefined, { required: false })

      // Show "check your email" confirmation — no redirect.
      setSubmittedEmail(data.Email)
      toast.success(t("register.checkEmailTitle"))
      return
    } catch (err) {
      // Localized by the error's stable code; falls back to a generic message.
      toast.error(localizedError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Build /sign-in link preserving return_to if present
  const signInHref = returnTo
    ? `/sign-in?return_to=${encodeURIComponent(returnTo)}`
    : "/sign-in"

  // ---------------------------------------------------------------------------
  // Success state: replace the form with a "check your email" confirmation card
  // ---------------------------------------------------------------------------
  if (submittedEmail !== null) {
    return (
      <AuthLayout reversed={true} variant="signup">
        <AuthPane>
          <MailCheck size={32} className="text-action" aria-hidden />
          <AuthHeading
            title={t("register.checkEmailTitle")}
            subtitle={withEmail(t("register.checkEmailBody"), submittedEmail)}
          />
          <AuthSwitch text={t("register.haveAccount")} href={signInHref} action={t("register.signIn")} />
        </AuthPane>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout reversed={true} variant="signup">
      <AuthPane>
        <AuthHeading title={t("register.title")} subtitle={t("register.subtitle")} />

          {/* Google sign-in bounced here because the account doesn't exist yet — say why, up top. */}
          {googleError === "not_registered" && (
            <Alert variant="warn">
              <CircleAlert />
              <AlertTitle>{t("signUp.googleNotRegisteredTitle")}</AlertTitle>
              <AlertDescription>
                {t("signUp.googleNotRegistered")}{" "}
                <Link href={signInHref} className="font-medium underline underline-offset-3">
                  {t("register.signIn")}
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Google registration — plain navigation; distinct from sign-in's /api/auth/google.
              return_to is carried through Google and /setup. An already-linked
              Google account is signed in directly by the backend. */}
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              const q = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""
              window.location.href = apiUrl(`/api/auth/google/register${q}`)
            }}
          >
            <GoogleIcon />
            {t("register.continueWithGoogle")}
          </Button>

          <AuthDivider label={t("register.orWithEmail")} />



          {googleError === "failed" && (
            <Alert variant="destructive">
              <AlertDescription>{t("signUp.googleFailed")}</AlertDescription>
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
                        placeholder={t("register.emailPlaceholder")}
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
                {t("register.submit")}
              </Button>
            </form>
          </Form>

        <AuthSwitch text={t("register.haveAccount")} href={signInHref} action={t("register.signIn")} />
      </AuthPane>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps the form in Suspense to satisfy `output: 'export'`
// static prerendering when useSearchParams is used inside.
// ---------------------------------------------------------------------------
export function SignUpScreen() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
