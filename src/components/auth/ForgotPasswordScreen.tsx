"use client"

import React, { Suspense, useState } from "react"
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

// ---------------------------------------------------------------------------
// Zod schema — mirrors the daemon's JSON body (Email)
// ---------------------------------------------------------------------------
const ForgotPasswordSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
})

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>

// ---------------------------------------------------------------------------
// Inner component — wrapped in <Suspense> for static-export compatibility.
// (Kept consistent with the other auth pages even though this one does not
// read useSearchParams; the Suspense boundary is harmless and future-proof.)
// ---------------------------------------------------------------------------
function ForgotPasswordForm() {
  const { executeRecaptcha } = useReCaptcha()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    mode: "onChange",
    defaultValues: { Email: "" },
  })

  const onSubmit: SubmitHandler<ForgotPasswordValues> = async (data) => {
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      // Obtain a reCAPTCHA token only when a site key is configured.
      // The /forgot-password endpoint is protected by RequireRecaptcha("forgotPassword");
      // when reCAPTCHA is disabled on the backend the middleware treats the token as optional.
      let recaptchaToken: string | undefined
      if (false) {
        try {
          recaptchaToken = await executeRecaptcha("forgotPassword")
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

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      // The daemon ALWAYS returns success on a well-formed request — it does not
      // reveal whether the account exists. On 2xx we show a neutral confirmation
      // that does NOT confirm the email is registered.
      if (res.ok) {
        setSubmitted(true)
        return
      }

      // Parse the 4xx JSON error from the daemon (rare, e.g. reCAPTCHA failure).
      let message: string = t("forgotPassword.errorTitle")
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

  // ---------------------------------------------------------------------------
  // Success state: neutral confirmation — does NOT confirm the account exists.
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <AuthLayout reversed={false} variant="recover">
        <div className="flex w-full max-w-md flex-col">
          <div className="mb-6 flex justify-center">
            <Logo size={88} />
          </div>
          <Card className="frost-panel frost-in w-full">
            <CardHeader>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">CyberICEBox</span>
              <CardTitle>{t("forgotPassword.checkEmailTitle")}</CardTitle>
              <CardDescription>
                {t("forgotPassword.checkEmailBody")}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center text-sm text-muted-foreground">
              <Link href="/sign-in" className="text-primary hover:underline">
                {t("forgotPassword.backToSignIn")}
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout reversed={false} variant="recover">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Logo size={88} />
        </div>
        <Card className="frost-panel frost-in w-full">
          <CardHeader>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">CyberICEBox</span>
            <CardTitle>{t("forgotPassword.title")}</CardTitle>
            <CardDescription>{t("forgotPassword.subtitle")}</CardDescription>
          </CardHeader>

        <CardContent className="space-y-4">
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
              >
                {isSubmitting ? t("common.loading") : t("forgotPassword.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          <Link href="/sign-in" className="text-primary hover:underline">
            {t("forgotPassword.backToSignIn")}
          </Link>
        </CardFooter>
        </Card>
      </div>
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
