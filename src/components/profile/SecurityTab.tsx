"use client"

import React, { useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiPost } from "@/api/client"
import { t } from "@/i18n/t"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"

function buildSchema(hasPassword: boolean) {
  return z
    .object({
      OldPassword: z.string().optional(),
      NewPassword: z
        .string()
        .min(8, { message: t("validation.passwordMin") }),
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const schema = useMemo(() => buildSchema(account.HasPassword), [account.HasPassword])

  const form = useForm<SecurityValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { OldPassword: "", NewPassword: "", ConfirmPassword: "" },
  })

  const onSubmit: SubmitHandler<SecurityValues> = async (data) => {
    setErrorMsg(null)
    setOkMsg(null)
    setIsSubmitting(true)
    try {
      const body: Record<string, string> = { NewPassword: data.NewPassword }
      if (account.HasPassword && data.OldPassword) {
        body.OldPassword = data.OldPassword
      }
      await apiPost("/api/account/password", body)
      setOkMsg(t("profile.security.saved"))
      form.reset({ OldPassword: "", NewPassword: "", ConfirmPassword: "" })
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="frost-panel">
      <CardHeader>
        <CardTitle>{t("profile.security.title")}</CardTitle>
        <CardDescription>
          {account.HasPassword
            ? t("profile.security.description")
            : t("profile.security.setFirstDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}
        {okMsg && (
          <Alert>
            <AlertDescription>{okMsg}</AlertDescription>
          </Alert>
        )}

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
                      <Input
                        type="password"
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
                    <Input
                      type="password"
                      placeholder={t("profile.security.newPasswordPlaceholder")}
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
                  <FormLabel>{t("profile.security.confirmPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.loading") : t("profile.security.save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
