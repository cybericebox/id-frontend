"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
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
import { apiPost } from "@/api/client"
import { t } from "@/i18n/t"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"

// NewPassword is checked against the live backend policy (read from the ref).
function buildSchema(hasPassword: boolean, policyRef: React.RefObject<PasswordPolicy>) {
  return z
    .object({
      OldPassword: z.string().optional(),
      NewPassword: z.string().superRefine((value, ctx) => {
        const msg = passwordError(value, policyRef.current)
        if (msg) ctx.addIssue({ code: "custom", message: msg })
      }),
      ConfirmPassword: z.string(),
    })
    .superRefine((val, ctx) => {
      if (hasPassword && !val.OldPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["OldPassword"],
          message: t("validation.required"),
        })
      }
      if (val.NewPassword !== val.ConfirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ConfirmPassword"],
          message: t("validation.passwordsNoMatch"),
        })
      }
    })
}

type SecurityValues = {
  OldPassword?: string
  NewPassword: string
  ConfirmPassword: string
}

export function SecurityTab({ account }: { account: Account }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const policy = usePasswordPolicy()
  const policyRef = useRef(policy)
  useEffect(() => {
    policyRef.current = policy
  }, [policy])

  const schema = useMemo(() => buildSchema(account.HasPassword, policyRef), [account.HasPassword])

  const form = useForm<SecurityValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { OldPassword: "", NewPassword: "", ConfirmPassword: "" },
  })

  const onSubmit: SubmitHandler<SecurityValues> = async (data) => {
    setIsSubmitting(true)
    try {
      const body: Record<string, string> = { NewPassword: data.NewPassword }
      if (account.HasPassword && data.OldPassword) {
        body.OldPassword = data.OldPassword
      }
      await apiPost("/api/auth/password/change", body)
      toast.success(t("profile.security.saved"))
      form.reset({ OldPassword: "", NewPassword: "", ConfirmPassword: "" })
    } catch (err) {
      // A 401 is auto-redirected by the api client (passwords are never persisted).
      toast.error(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.security.title")}</CardTitle>
        <CardDescription>
          {account.HasPassword
            ? t("profile.security.description")
            : t("profile.security.setFirstDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {account.HasPassword && (
              <FormField
                control={form.control}
                name="OldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.security.currentPassword")}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="NewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profile.security.newPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={t("profile.security.newPasswordPlaceholder")}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
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
                  <FormLabel>{t("profile.security.confirmPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.formState.isDirty ||
                  !form.formState.isValid
                }
              >
                {isSubmitting ? t("common.loading") : t("profile.security.save")}
              </Button>
              {form.formState.isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset()}
                  disabled={isSubmitting}
                >
                  {t("common.reset")}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
