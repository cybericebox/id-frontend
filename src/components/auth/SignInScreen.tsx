"use client"

import React, { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useReCaptcha } from "next-recaptcha-v3"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/brand/Logo"
import { AuthLayout } from "./AuthLayout"
import { t } from "@/i18n/t"
import { PageLoader } from "@/components/ui/spinner"
import { redirectIfAuthed, rememberReturnTo, safeReturnTo } from "@/lib/auth"
import { apiPost } from "@/api/client"

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
    redirectIfAuthed(returnTo || undefined).then((redirecting) => {
      if (!cancelled && !redirecting) setChecking(false)
    }).catch(() => {
      // On any failure (e.g. the /me probe errored), never hang the loader —
      // reveal the form so the user can sign in.
      if (!cancelled) setChecking(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { executeRecaptcha } = useReCaptcha()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    mode: "onBlur",
    defaultValues: { Email: "", Password: "" },
  })

  if (checking) return <PageLoader />

  const onSubmit: SubmitHandler<SignInValues> = async (data) => {
    setErrorMsg(null)
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

      // The backend now returns 200 JSON { Status, Data: { RedirectURL } } instead
      // of a 307 redirect. apiPost unwraps the envelope and throws ApiError on 4xx.
      // We perform a top-level navigation to RedirectURL — this is NOT CORS-restricted
      // and allows the callback to plant the per-subdomain local token before
      // redirecting to the final page.
      const { RedirectURL } = await apiPost<{ RedirectURL: string }>(
        "/api/auth/sign-in",
        body
      )

      if (RedirectURL) {
        window.location.assign(RedirectURL)
      } else {
        window.location.assign(safeReturnTo(returnTo || undefined))
      }
    } catch (err) {
      // ApiError.message is already the envelope Status.Message (unwrapped in client.ts)
      setErrorMsg(err instanceof Error ? err.message : t("error.generic"))
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
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Logo size={88} />
        </div>
        <Card className="frost-panel frost-in w-full">
          <CardHeader>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">CyberICEBox</span>
            <CardTitle>{t("signIn.title")}</CardTitle>
            <CardDescription>{t("signIn.subtitle")}</CardDescription>
          </CardHeader>

        <CardContent className="space-y-4">
          {/* Google sign-in — plain navigation; the daemon redirects the browser
              to the Google consent page. Errors (inactive/unlinked account) surface
              on the callback redirect, not here. */}
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/google"
            }}
          >
            {t("signIn.continueWithGoogle")}
          </Button>

          <div className="relative flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex-1 border-t" />
            {t("signIn.orWithEmail")}
            <span className="flex-1 border-t" />
          </div>

          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
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
                      <Link
                        href="/forgot-password"
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        {t("signIn.forgotPassword")}
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
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
                {isSubmitting ? t("common.loading") : t("signIn.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          {t("signIn.noAccount")}&nbsp;
          <Link href={registerHref} className="text-primary hover:underline">
            {t("signIn.createAccount")}
          </Link>
        </CardFooter>
        </Card>
      </div>
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
