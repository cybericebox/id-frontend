"use client"

import React, { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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
// Zod schema — NewPassword + ConfirmPassword (refine: must match).
// The daemon's resetPassword handler binds a single `Password` field; only
// NewPassword is sent to the backend.
// ---------------------------------------------------------------------------
const ResetPasswordSchema = z
  .object({
    NewPassword: z
      .string()
      .min(8, { message: t("validation.passwordMin") })
      .max(255),
    ConfirmPassword: z.string().max(255),
  })
  .refine((data) => data.NewPassword === data.ConfirmPassword, {
    message: t("validation.passwordsNoMatch"),
    path: ["ConfirmPassword"],
  })

type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>

// ---------------------------------------------------------------------------
// Error state card — used when the reset code is missing/invalid.
// ---------------------------------------------------------------------------
function ErrorCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="text-primary hover:underline"
          >
            {t("resetPassword.requestNewLink")}
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Inner component (uses useSearchParams — must be inside <Suspense>).
// ---------------------------------------------------------------------------
function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const code = searchParams.get("code") ?? ""

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(ResetPasswordSchema),
    mode: "onChange",
    defaultValues: { NewPassword: "", ConfirmPassword: "" },
  })

  const onSubmit: SubmitHandler<ResetPasswordValues> = async (data) => {
    setErrorMsg(null)
    setIsSubmitting(true)

    try {
      // The reset code is a PATH segment, NOT a query param or body field.
      // Body field name `Password` matches the daemon resetPassword handler
      // (internal/delivery/controller/http/handler/auth/password.go).
      // This endpoint is NOT reCAPTCHA-protected.
      const res = await fetch(
        `/api/auth/password/reset/${encodeURIComponent(code)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ Password: data.NewPassword }),
        }
      )

      // The reset endpoint returns success JSON (not a session); the user signs
      // in afterward.
      if (res.ok) {
        setSucceeded(true)
        return
      }

      // Parse 4xx error body from daemon (invalid/expired code, complexity).
      let message: string = t("resetPassword.errorTitle")
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
  // Guard: no code in URL.
  // ---------------------------------------------------------------------------
  if (!code) {
    return (
      <ErrorCard
        title={t("resetPassword.missingCodeTitle")}
        description={t("resetPassword.missingCodeDescription")}
      />
    )
  }

  // ---------------------------------------------------------------------------
  // Success state.
  // ---------------------------------------------------------------------------
  if (succeeded) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("resetPassword.successTitle")}</CardTitle>
            <CardDescription>{t("resetPassword.successBody")}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            <Link href="/sign-in" className="text-primary hover:underline">
              {t("resetPassword.goToSignIn")}
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
          <CardTitle>{t("resetPassword.title")}</CardTitle>
          <CardDescription>{t("resetPassword.subtitle")}</CardDescription>
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
                name="NewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resetPassword.newPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t("resetPassword.newPasswordPlaceholder")}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ConfirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("resetPassword.confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t(
                          "resetPassword.confirmPasswordPlaceholder"
                        )}
                        autoComplete="new-password"
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
                {isSubmitting ? t("common.loading") : t("resetPassword.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          <Link href="/sign-in" className="text-primary hover:underline">
            {t("common.signIn")}
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps in <Suspense> for static-export compatibility
// (useSearchParams opts out of static prerendering without it).
// ---------------------------------------------------------------------------
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
