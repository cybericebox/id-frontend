"use client"

import React, { useState, useEffect } from "react"
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReauthPasswordField } from "./ReauthPasswordField"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { apiPost, apiDelete } from "@/api/client"
import { t } from "@/i18n/t"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"
import { STORAGE_DRAFT_ACCOUNT_EMAIL } from "@/lib/storageKeys"


// The account password re-confirms the change; the draft keeps the address only.
const EmailSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
  CurrentPassword: z.string().min(1, { message: t("validation.required") }),
})
type EmailValues = z.infer<typeof EmailSchema>

export function AccountTab({ account }: { account: Account }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deletePassword, setDeletePassword] = useState("")

  const form = useForm<EmailValues>({
    resolver: zodResolver(EmailSchema),
    mode: "onBlur",
    defaultValues: { Email: "", CurrentPassword: "" },
  })

  // Draft persistence: restore on mount, persist edits continuously so the new
  // email survives an auth redirect (client auto-redirects on 401). Cleared on send.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_DRAFT_ACCOUNT_EMAIL)
      if (raw) form.reset({ Email: (JSON.parse(raw) as { Email?: string }).Email ?? "", CurrentPassword: "" })
    } catch {
      /* ignore */
    }
    const sub = form.watch((values) => {
      try {
        sessionStorage.setItem(STORAGE_DRAFT_ACCOUNT_EMAIL, JSON.stringify({ Email: values.Email ?? "" }))
      } catch {
        /* ignore */
      }
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  const onSubmit: SubmitHandler<EmailValues> = async (data) => {
    setIsSubmitting(true)
    try {
      await apiPost("/api/auth/account/email", { Email: data.Email, CurrentPassword: data.CurrentPassword })
      sessionStorage.removeItem(STORAGE_DRAFT_ACCOUNT_EMAIL) // sent — drop the draft
      toast.success(t("profile.account.emailSent"))
      form.reset({ Email: "", CurrentPassword: "" })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDelete = async () => {
    setIsDeleting(true)
    setDeleteError("")
    try {
      await apiDelete(
        "/api/auth/account",
        undefined,
        undefined,
        account.HasPassword ? { CurrentPassword: deletePassword } : undefined
      )
      toast.success(t("profile.account.deleted"))
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Reload after account deletion to discard authenticated client state.
      window.location.href = "/sign-in"
    } catch (err) {
      setDeleteError(extractError(err))
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.account.title")}</CardTitle>
          <CardDescription>{t("profile.account.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-dim">
              {t("profile.account.currentEmail")}:{" "}
            </span>
            <span className="font-medium text-ink">{account.Email}</span>{" "}
            <span className={account.EmailConfirmed ? "text-ok" : "text-warn"}>
              (
              {account.EmailConfirmed
                ? t("profile.account.confirmed")
                : t("profile.account.unconfirmed")}
              )
            </span>
          </div>


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
                    <FormLabel>{t("profile.account.newEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("profile.account.newEmailPlaceholder")}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {account.HasPassword && (
                <FormField
                  control={form.control}
                  name="CurrentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.security.currentPassword")}</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <p className="text-sm text-dim">{t("profile.account.emailGoogleNote")}</p>
              {!account.HasPassword && (
                <Alert variant="warn">
                  <AlertDescription>{t("profile.account.emailNeedsPassword")}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    !account.HasPassword ||
                    isSubmitting ||
                    !form.formState.isDirty ||
                    !form.formState.isValid
                  }
                >
                  {isSubmitting
                    ? t("common.loading")
                    : t("profile.account.changeEmail")}
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

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger">
            {t("profile.account.dangerTitle")}
          </CardTitle>
          <CardDescription>
            {t("profile.account.dangerDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => { setDeleteError(""); setDeletePassword(""); setDeleteOpen(true) }}>
            {t("profile.account.deleteButton")}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        tone="danger"
        busy={isDeleting}
        error={deleteError}
        title={t("profile.account.deleteConfirmTitle")}
        description={t("profile.account.deleteConfirmBody")}
        confirmLabel={t("profile.account.deleteConfirmButton")}
        disabled={account.HasPassword && !deletePassword}
        onConfirm={() => void onDelete()}
      >
        {account.HasPassword && (
          <ReauthPasswordField
            id="delete-account-password"
            hint={t("profile.account.deletePasswordHint")}
            value={deletePassword}
            onChange={setDeletePassword}
            disabled={isDeleting}
          />
        )}
      </ConfirmDialog>
    </div>
  )
}
