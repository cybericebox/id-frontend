"use client"

import React, { useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { signInWithRecoveryCode } from "@/api/secondFactor"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { FormError, reportFormError } from "@/components/ui/form-error"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { t } from "@/i18n/t"
import { safeReturnTo } from "@/lib/auth"
import { executeCaptcha } from "@/lib/captcha"
import { isRecoveryCode } from "@/lib/stepUp"
import { hosts } from "@/lib/hosts"
import { useGuestOnly } from "@/lib/useGuestOnly"
import { useUrlParams } from "@/lib/useUrlParams"
import { AuthLayout } from "./AuthLayout"
import { AuthHeading, AuthPane, AuthSwitch } from "./parts"

const Schema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
  Password: z.string().min(1, { message: t("validation.required") }),
  Code: z.string().refine(isRecoveryCode, { message: t("validation.recoveryCode") }),
})
type Values = z.infer<typeof Schema>

/**
 * Sign-in with a recovery code when the second factor is lost: the password is always checked, the code stands in
 * for the factor. The new session may replace the factor, so without a return_to it lands on Sign-in and security.
 * Every failure is one form-level message: the backend never says which part was wrong.
 */
export function RecoverySignInScreen() {
  const params = useUrlParams()
  const returnTo = params?.get("return_to") ?? ""
  useGuestOnly(params !== null, returnTo || undefined)
  const securityTab = `https://${hosts().id}/profile/?tab=security`

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(Schema), mode: "onSubmit", defaultValues: { Email: "", Password: "", Code: "" } })

  const onSubmit: SubmitHandler<Values> = async (data) => {
    setFormError(null)
    setBusy(true)
    let RecaptchaToken: string
    try {
      RecaptchaToken = await executeCaptcha("recoverySignIn")
    } catch {
      setFormError(t("error.captcha"))
      setBusy(false)
      return
    }
    try {
      const redirect = await signInWithRecoveryCode({
        Email: data.Email,
        Password: data.Password,
        Code: data.Code.trim().toUpperCase(),
        RecaptchaToken,
        Redirect: returnTo || securityTab,
      })
      // The button stays busy while the browser navigates.
      window.location.assign(redirect || safeReturnTo(returnTo || undefined, securityTab))
    } catch (err) {
      reportFormError(err, setFormError)
      setBusy(false)
    }
  }

  const returnQuery = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""

  return (
    <AuthLayout variant="signin">
      <AuthPane>
        <AuthHeading title={t("recoverySignIn.title")} subtitle={t("recoverySignIn.subtitle")} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="Email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t("common.emailPlaceholder")} autoComplete="email" {...field} />
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
                  <FormLabel>{t("common.password")}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="Code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("recoverySignIn.code")}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      className="font-mono uppercase tracking-wider"
                      placeholder={t("recoverySignIn.codePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError message={formError} />
            <Button type="submit" className="w-full" busy={busy} busyLabel={t("common.busy.signingIn")}>
              {t("recoverySignIn.submit")}
            </Button>
          </form>
        </Form>
        <AuthSwitch text={t("recoverySignIn.backText")} href={`/sign-in${returnQuery}`} action={t("recoverySignIn.back")} />
      </AuthPane>
    </AuthLayout>
  )
}
