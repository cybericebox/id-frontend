"use client"

import React, { useId, useState, useEffect, useMemo, useRef } from "react"
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
import { FormError, reportFormError } from "@/components/ui/form-error"
import { useUrlParams } from "@/lib/useUrlParams"
import { useGuestOnly } from "@/lib/useGuestOnly"
import { AuthLayout } from "./AuthLayout"
import { AuthHeading, AuthPane, AuthSwitch } from "./parts"
import { t } from "@/i18n/t"
import { apiPost } from "@/api/client"

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
// The reset token comes from the URL on the client. The form itself is in the static HTML; «no link» is shown only
// once the URL is known (params !== null).
// ---------------------------------------------------------------------------
export function ResetPasswordScreen() {
  const params = useUrlParams()
  // The reset email links to /reset-password?token=… (backend useCase/auth/password.go);
  // ?code= is still accepted for links issued before that.
  const code = params?.get("token") ?? params?.get("code") ?? ""
  const returnTo = params?.get("return_to") ?? undefined
  useGuestOnly(params !== null, returnTo, undefined)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const policy = usePasswordPolicy()
  const policyRef = useRef(policy)
  useEffect(() => {
    policyRef.current = policy
  }, [policy])
  // eslint-disable-next-line @eslint-react/exhaustive-deps
  const schema = useMemo(() => buildResetSchema(policyRef), [])

  const strengthId = useId()
  const msgId = useId()
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { NewPassword: "", ConfirmPassword: "" },
  })

  const signInHref = returnTo ? `/sign-in?return_to=${encodeURIComponent(returnTo)}` : "/sign-in"

  const onSubmit: SubmitHandler<ResetPasswordValues> = async (data) => {
    setFormError(null)
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
      return
    } catch (err) {
      reportFormError(err, setFormError)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Guard: no code in URL.
  // ---------------------------------------------------------------------------
  if (params !== null && !code) {
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
                      aria-describedby={field.value ? strengthId : form.formState.errors.NewPassword ? msgId : undefined}
                    />
                  </FormControl>
                  {/* with text typed, the strength line names what is missing and is the field's description;
                      the empty-field error shows only while there is no text */}
                  <PasswordStrength id={strengthId} value={field.value} policy={policy} />
                  {!field.value && <FormMessage id={msgId} />}
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

            <FormError message={formError} />
            {/* a used or expired link is only known after the submit: offer the way out next to the error */}
            {formError && <AuthSwitch href="/forgot-password" action={t("resetPassword.requestNewLink")} />}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              busy={isSubmitting}
            >
              {t("resetPassword.submit")}
            </Button>
          </form>
        </Form>

        <AuthSwitch href={signInHref} action={t("forgotPassword.backToSignIn")} />
      </AuthPane>
    </AuthLayout>
  )
}
