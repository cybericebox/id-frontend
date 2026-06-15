"use client"

import React, { Suspense, useState } from "react"
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
import { t } from "@/i18n/t"

// ---------------------------------------------------------------------------
// Zod schema — mirrors the daemon's JSON body (Email only for registration)
// ---------------------------------------------------------------------------
const RegisterSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
})

type RegisterValues = z.infer<typeof RegisterSchema>

// ---------------------------------------------------------------------------
// Inner component — must be wrapped in <Suspense> because useSearchParams()
// opts out of static prerendering (required for `output: 'export'`).
// ---------------------------------------------------------------------------
function RegisterForm() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return_to") ?? ""

  const { executeRecaptcha } = useReCaptcha()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    mode: "onChange",
    defaultValues: { Email: "" },
  })

  const onSubmit: SubmitHandler<RegisterValues> = async (data) => {
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      // Obtain a reCAPTCHA token only when a site key is configured.
      // If NEXT_PUBLIC_RECAPTCHA_SITE_KEY is absent (local dev / disabled backend),
      // omit RecaptchaToken entirely — the daemon middleware treats it as optional
      // when reCAPTCHA is disabled.
      let recaptchaToken: string | undefined
      if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
        try {
          recaptchaToken = await executeRecaptcha("beginEmailRegistration")
        } catch {
          // reCAPTCHA script may not have loaded yet; continue without the token
          // so the user isn't blocked if the script fails in local/offline envs.
          recaptchaToken = undefined
        }
      }

      const body: Record<string, string> = {
        Email: data.Email,
      }
      if (recaptchaToken) {
        body.RecaptchaToken = recaptchaToken
      }

      const res = await fetch("/api/auth/register/email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        // Show "check your email" confirmation — no redirect.
        setSubmittedEmail(data.Email)
        return
      }

      // Parse the 4xx JSON error from the daemon and surface it inline.
      let message: string = t("register.errorTitle")
      try {
        const payload = await res.json()
        if (typeof payload === "object" && payload !== null) {
          message =
            (payload as { message?: string; error?: string }).message ??
            (payload as { message?: string; error?: string }).error ??
            message
        }
      } catch {
        // non-JSON error body — keep the generic message
      }
      setErrorMsg(message)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("error.generic"))
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
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("register.checkEmailTitle")}</CardTitle>
            <CardDescription>
              {t("register.checkEmailBody").replace("{email}", submittedEmail)}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            {t("register.haveAccount")}&nbsp;
            <Link href={signInHref} className="text-primary hover:underline">
              {t("register.signIn")}
            </Link>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("register.title")}</CardTitle>
          <CardDescription>{t("register.subtitle")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google registration — plain navigation; distinct from sign-in's /api/auth/google */}
          <Button
            variant="outline"
            className="w-full"
            type="button"
            onClick={() => {
              window.location.href = "/api/auth/register/google"
            }}
          >
            {t("register.continueWithGoogle")}
          </Button>

          <div className="relative flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex-1 border-t" />
            {t("register.orWithEmail")}
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
              >
                {isSubmitting ? t("common.loading") : t("register.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          {t("register.haveAccount")}&nbsp;
          <Link href={signInHref} className="text-primary hover:underline">
            {t("register.signIn")}
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps the form in Suspense to satisfy `output: 'export'`
// static prerendering when useSearchParams is used inside.
// ---------------------------------------------------------------------------
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
