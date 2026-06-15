"use client"

import React, { useState } from "react"
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
import { apiPatch, ApiError } from "@/api/client"
import { t } from "@/i18n/t"
import type { Account } from "./types"

const ProfileSchema = z.object({
  FirstName: z.string().min(1, { message: t("validation.required") }).max(255),
  LastName: z.string().min(1, { message: t("validation.required") }).max(255),
})

type ProfileValues = z.infer<typeof ProfileSchema>

export function ProfileTab({
  account,
  onUpdated,
}: {
  account: Account
  onUpdated: () => void
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    mode: "onChange",
    defaultValues: { FirstName: account.FirstName, LastName: account.LastName },
  })

  const onSubmit: SubmitHandler<ProfileValues> = async (data) => {
    setErrorMsg(null)
    setOkMsg(null)
    setIsSubmitting(true)
    try {
      await apiPatch("/api/account/profile", {
        FirstName: data.FirstName,
        LastName: data.LastName,
      })
      setOkMsg(t("profile.profile.saved"))
      onUpdated()
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const createdAt = account.CreatedAt
    ? new Date(account.CreatedAt).toLocaleDateString()
    : "—"

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.profile.title")}</CardTitle>
        <CardDescription>{t("profile.profile.description")}</CardDescription>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="FirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profile.profile.firstName")}</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="LastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profile.profile.lastName")}</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-1 text-sm text-muted-foreground">
              <span>
                {t("profile.profile.role")}: {account.Role || "—"}
              </span>
              <span>
                {t("profile.profile.createdAt")}: {createdAt}
              </span>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("common.loading") : t("profile.profile.save")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

// Shared helper: surface a daemon error message from an ApiError body.
export function extractError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string; error?: string } | string | null
    if (body && typeof body === "object") {
      return body.message ?? body.error ?? t("error.generic")
    }
  }
  return err instanceof Error ? err.message : t("error.generic")
}
