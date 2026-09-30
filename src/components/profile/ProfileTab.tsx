"use client"

import React, { useState, useRef, useEffect } from "react"
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
import { toast } from "@/components/ui/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiPatch, apiUrl, mediaUrl } from "@/api/client"
import { localizedError, localizedResponseError } from "@/i18n/apiError"
import { t } from "@/i18n/t"
import { initials } from "@/lib/initials"
import type { Account } from "./types"

import { AvatarCropDialog } from "./AvatarCropDialog"
import { STORAGE_DRAFT_PROFILE_NAME } from "@/lib/storageKeys"

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPhotoBusy, setIsPhotoBusy] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    mode: "onBlur",
    defaultValues: { FirstName: account.FirstName, LastName: account.LastName },
  })

  // Draft persistence: restore on mount, then persist edits continuously so the
  // in-progress name survives an auth redirect (the client auto-redirects on 401).
  // Cleared on a successful save.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_DRAFT_PROFILE_NAME)
      if (raw) form.reset(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    const sub = form.watch((values) => {
      try {
        sessionStorage.setItem(STORAGE_DRAFT_PROFILE_NAME, JSON.stringify(values))
      } catch {
        /* ignore */
      }
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024

  const onPickPhoto = () => fileInputRef.current?.click()

  // Validate the picked file, then open the crop editor. Upload happens only
  // after the user confirms the crop (onCropConfirm).
  const onPhotoChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    setErrorMsg(null)
    if (!file.type.startsWith("image/")) {
      setErrorMsg(t("profile.profile.photoInvalidType"))
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMsg(t("profile.profile.photoTooLarge"))
      return
    }
    setCropSrc(URL.createObjectURL(file))
  }

  const closeCropper = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const onCropConfirm = async (blob: Blob) => {
    closeCropper()
    setIsPhotoBusy(true)
    try {
      const fd = new FormData()
      fd.append("file", blob, "avatar.jpg")
      // Raw fetch: multipart body, let the browser set the Content-Type boundary.
      // apiUrl keeps it on the API origin (api.<domain>) — a bare relative path
      // would hit the id.<domain> frontend origin and 404.
      const res = await fetch(apiUrl("/api/auth/account/avatar"), {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        toast.error(await localizedResponseError(res))
        return
      }
      toast.success(t("profile.profile.photoUpdated"))
      onUpdated()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setIsPhotoBusy(false)
    }
  }

  const onRemovePhoto = async () => {
    setErrorMsg(null)
    setIsPhotoBusy(true)
    try {
      const res = await fetch(apiUrl("/api/auth/account/avatar"), {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        toast.error(await localizedResponseError(res))
        return
      }
      toast.success(t("profile.profile.photoRemoved"))
      onUpdated()
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setIsPhotoBusy(false)
    }
  }

  const onSubmit: SubmitHandler<ProfileValues> = async (data) => {
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      await apiPatch("/api/auth/account/profile", {
        FirstName: data.FirstName,
        LastName: data.LastName,
      })
      sessionStorage.removeItem(STORAGE_DRAFT_PROFILE_NAME) // saved — drop the draft
      form.reset(data)
      toast.success(t("profile.profile.saved"))
      onUpdated()
    } catch (err) {
      // A 401 is auto-redirected by the api client (the draft is already persisted).
      toast.error(extractError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.profile.title")}</CardTitle>
        <CardDescription>{t("profile.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 border-b border-line pb-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-2xl font-semibold text-on-brand">
            {account.Picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(account.Picture)}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              initials(account.FirstName, account.LastName, account.Email)
            )}
          </span>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium">{t("profile.profile.photo")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChosen}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPickPhoto}
                disabled={isPhotoBusy}
              >
                {account.Picture
                  ? t("profile.profile.changePhoto")
                  : t("profile.profile.addPhoto")}
              </Button>
              {account.Picture && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemovePhoto}
                  disabled={isPhotoBusy}
                >
                  {t("profile.profile.removePhoto")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <AvatarCropDialog
          open={cropSrc !== null}
          imageSrc={cropSrc}
          onCancel={closeCropper}
          onConfirm={onCropConfirm}
        />

        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
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

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.formState.isDirty ||
                  !form.formState.isValid
                }
                busy={isSubmitting}
              >
                {t("profile.profile.save")}
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

// Shared helper: localize an API error by its stable code (Status.Code), never
// the backend's English message.
export function extractError(err: unknown): string {
  return localizedError(err)
}
