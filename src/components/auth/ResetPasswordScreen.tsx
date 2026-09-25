"use client"

import React, { Suspense, useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CircleCheck, LinkIcon } from "lucide-react"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordStrength, passwordError } from "@/components/ui/password-strength"
import { usePasswordPolicy, type PasswordPolicy } from "@/lib/passwordPolicy"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { AuthLayout } from "./AuthLayout"
import { AuthHeading, AuthPane, AuthSwitch } from "./parts"
import { t } from "@/i18n/t"
import { PageLoader } from "@/components/ui/spinner"
import { redirectIfAuthed, rememberReturnTo } from "@/lib/auth"
import { apiPost } from "@/api/client"
import { localizedError } from "@/i18n/apiError"

// ---------------------------------------------------------------------------
// Zod schema — NewPassword + ConfirmPassword (refine: must match).
// The daemon's resetPassword handler binds { Code, Password }; only NewPassword
// is sent to the backend.
// ---------------------------------------------------------------------------
// Built once per form; reads the live backend policy from the ref at validation time.
function buildResetSchema(policyRef: React.RefObject<PasswordPolicy>) {
  return z
    .object({
      NewPassword: z.string().superRefine((value, ctx) => {
        const msg = passwordError(value, policyRef.current)
        if (msg) ctx.addIssue({ code: "custom", message: msg })
      }),
      ConfirmPassword: z.string().max(255),
    })
    .refine((data) => data.NewPassword === data.ConfirmPassword, {
      message: t("validation.passwordsNoMatch"),
      path: ["ConfirmPassword"],
    })
}

type ResetPasswordValues = z.infer<ReturnType<typeof buildResetSchema>>

// ---------------------------------------------------------------------------
// Inner component (uses useSearchParams — must be inside <Suspense>).
// ---------------------------------------------------------------------------
function ResetPasswordForm() {
  const searchParams = useSearchParams()
  // The reset email links to /reset-password?token=… (backend useCase/auth/password.go);
  // ?code= is still accepted for links issued before that.
  const code = searchParams.get("token") ?? searchParams.get("code") ?? ""
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
  const [succeeded, setSucceeded] = useState(false)

  const policy = usePasswordPolicy()
  const policyRef = useRef(policy)
  useEffect(() => {
    policyRef.current = policy
  }, [policy])
  // eslint-disable-next-line @eslint-react/exhaustive-deps
  const schema = useMemo(() => buildResetSchema(policyRef), [])

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { NewPassword: "", ConfirmPassword: "" },
  })

  if (checking) return <PageLoader />

  const signInHref = returnTo ? `/sign-in?return_to=${encodeURIComponent(returnTo)}` : "/sign-in"

  const onSubmit: SubmitHandler<ResetPasswordValues> = async (data) => {
    setIsSubmitting(true)

    try {
      // The reset code is sent in the request body alongside the new password.
      // This endpoint is NOT reCAPTCHA-protected.
      // required:false — a 4xx (invalid/expired code, password complexity) must
      // surface inline. The endpoint returns success JSON (not a session); the
      // user signs in afterward.
      await apiPost(
        "/api/auth/password/reset",
        { Code: code, Password: data.NewPassword },
        undefined,
        { required: false }
      )
      setSucceeded(true)
      toast.success(t("resetPassword.successTitle"))
      return
    } catch (err) {
      toast.error(localizedError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Guard: no code in URL.
  // ---------------------------------------------------------------------------
  if (!code) {
    return (
      <AuthLayout reversed={false} variant="reset">
        <AuthPane>
          <LinkIcon size={32} className="text-danger" aria-hidden />
          <AuthHeading
            title={t("resetPassword.missingCodeTitle")}
            subtitle={t("resetPassword.missingCodeDescription")}
          />
          <AuthSwitch href="/forgot-password" action={t("resetPassword.requestNewLink")} />
        </AuthPane>
      </AuthLayout>
    )
  }

  // ---------------------------------------------------------------------------
  // Success state.
  // ---------------------------------------------------------------------------
  if (succeeded) {
    return (
      <AuthLayout reversed={false} variant="reset">
        <AuthPane>
          <CircleCheck size={32} className="text-ok" aria-hidden />
          <AuthHeading title={t("resetPassword.successTitle")} subtitle={t("resetPassword.successBody")} />
          <AuthSwitch href={signInHref} action={t("resetPassword.goToSignIn")} />
        </AuthPane>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout reversed={false} variant="reset">
      <AuthPane>
        <AuthHeading title={t("resetPassword.title")} subtitle={t("resetPassword.subtitle")} />


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
                    <PasswordInput
                      placeholder={t("resetPassword.newPasswordPlaceholder")}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  {/* with text typed, the strength line names what is missing */}
                  <PasswordStrength value={field.value} policy={policy} />
                  <FormMessage className={field.value ? "hidden" : undefined} />
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
                    <PasswordInput
                      placeholder={t("resetPassword.confirmPasswordPlaceholder")}
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

        <AuthSwitch href={signInHref} action={t("forgotPassword.backToSignIn")} />
      </AuthPane>
    </AuthLayout>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps in <Suspense> for static-export compatibility
// (useSearchParams opts out of static prerendering without it).
// ---------------------------------------------------------------------------
export function ResetPasswordScreen() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
