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
import { toast } from "@/components/ui/toast"
import { apiPost, apiDelete } from "@/api/client"
import { t } from "@/i18n/t"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"

const EMAIL_DRAFT_KEY = "draft:account-email"

const EmailSchema = z.object({
  Email: z.string().email({ message: t("validation.invalidEmail") }),
})
type EmailValues = z.infer<typeof EmailSchema>

export function AccountTab({ account }: { account: Account }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<EmailValues>({
    resolver: zodResolver(EmailSchema),
    mode: "onBlur",
    defaultValues: { Email: "" },
  })

  // Draft persistence: restore on mount, persist edits continuously so the new
  // email survives an auth redirect (client auto-redirects on 401). Cleared on send.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(EMAIL_DRAFT_KEY)
      if (raw) form.reset(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    const sub = form.watch((values) => {
      try {
        sessionStorage.setItem(EMAIL_DRAFT_KEY, JSON.stringify(values))
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
      await apiPost("/api/auth/account/email", { Email: data.Email })
      sessionStorage.removeItem(EMAIL_DRAFT_KEY) // sent — drop the draft
      toast.success(t("profile.account.emailSent"))
      form.reset({ Email: "" })
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDelete = async () => {
    setIsDeleting(true)
    try {
      await apiDelete("/api/auth/account")
      toast.success(t("profile.account.deleted"))
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Reload after account deletion to discard authenticated client state.
      window.location.href = "/sign-in"
    } catch (err) {
      toast.error(extractError(err))
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
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
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
