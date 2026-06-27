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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiPost, apiDelete } from "@/api/client"
import { t } from "@/i18n/t"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"

const EmailSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
})
type EmailValues = z.infer<typeof EmailSchema>

export function AccountTab({ account }: { account: Account }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const form = useForm<EmailValues>({
    resolver: zodResolver(EmailSchema),
    mode: "onChange",
    defaultValues: { Email: "" },
  })

  const onSubmit: SubmitHandler<EmailValues> = async (data) => {
    setErrorMsg(null)
    setOkMsg(null)
    setIsSubmitting(true)
    try {
      await apiPost("/api/auth/account/email", { Email: data.Email })
      setOkMsg(t("profile.account.emailSent"))
      form.reset({ Email: "" })
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDelete = async () => {
    setDeleteError(null)
    setIsDeleting(true)
    try {
      await apiDelete("/api/auth/account")
      window.location.href = "/sign-in"
    } catch (err) {
      setDeleteError(extractError(err))
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="frost-panel">
        <CardHeader>
          <CardTitle>{t("profile.account.title")}</CardTitle>
          <CardDescription>{t("profile.account.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">
              {t("profile.account.currentEmail")}:{" "}
            </span>
            <span className="font-medium">{account.Email}</span>{" "}
            <span
              className={
                account.EmailConfirmed
                  ? "text-green-600"
                  : "text-muted-foreground"
              }
            >
              (
              {account.EmailConfirmed
                ? t("profile.account.confirmed")
                : t("profile.account.unconfirmed")}
              )
            </span>
          </div>

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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t("common.loading")
                  : t("profile.account.changeEmail")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="frost-panel border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("profile.account.dangerTitle")}
          </CardTitle>
          <CardDescription>
            {t("profile.account.dangerDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t("profile.account.deleteButton")}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("profile.account.deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("profile.account.deleteConfirmBody")}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? t("common.loading")
                : t("profile.account.deleteConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
