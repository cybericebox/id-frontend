"use client"

import React, { useState, useRef } from "react"
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
import { AvatarCropDialog } from "./AvatarCropDialog"

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
  const [isPhotoBusy, setIsPhotoBusy] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    mode: "onChange",
    defaultValues: { FirstName: account.FirstName, LastName: account.LastName },
  })

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024

  const onPickPhoto = () => fileInputRef.current?.click()

  // Validate the picked file, then open the crop editor. Upload happens only
  // after the user confirms the crop (onCropConfirm).
  const onPhotoChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    setErrorMsg(null)
    setOkMsg(null)
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
      const res = await fetch("/api/auth/account/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) {
        let msg = t("error.generic")
        try {
          const p = await res.json()
          msg = p?.Status?.Message ?? msg
        } catch {
          /* non-JSON */
        }
        setErrorMsg(msg)
        return
      }
      setOkMsg(t("profile.profile.photoUpdated"))
      onUpdated()
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setIsPhotoBusy(false)
    }
  }

  const onRemovePhoto = async () => {
    setErrorMsg(null)
    setOkMsg(null)
    setIsPhotoBusy(true)
    try {
      const res = await fetch("/api/auth/account/avatar", {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        let msg = t("error.generic")
        try {
          const p = await res.json()
          msg = p?.Status?.Message ?? msg
        } catch {
          /* non-JSON */
        }
        setErrorMsg(msg)
        return
      }
      setOkMsg(t("profile.profile.photoRemoved"))
      onUpdated()
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setIsPhotoBusy(false)
    }
  }

  const onSubmit: SubmitHandler<ProfileValues> = async (data) => {
    setErrorMsg(null)
    setOkMsg(null)
    setIsSubmitting(true)
    try {
      await apiPatch("/api/auth/account/profile", {
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

  return (
    <Card className="frost-panel">
      <CardHeader>
        <CardTitle>{t("profile.profile.title")}</CardTitle>
        <CardDescription>{t("profile.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[#0091EA] text-2xl font-semibold text-primary-foreground ring-2 ring-card">
            {account.Picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.Picture}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              `${account.FirstName?.[0] ?? ""}${account.LastName?.[0] ?? ""}`.toUpperCase() ||
              "?"
            )}
          </span>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("profile.profile.photo")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChosen}
            />
            <div className="flex gap-2">
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
    // Backend error envelope: { Status: { Code, Message } }. The client also
    // copies Status.Message onto ApiError.message, so prefer that.
    const body = err.body as { Status?: { Message?: string } } | string | null
    if (body && typeof body === "object" && body.Status?.Message) {
      return body.Status.Message
    }
    if (err.message && err.message !== `API error ${err.status}`) {
      return err.message
    }
    return t("error.generic")
  }
  return err instanceof Error ? err.message : t("error.generic")
}
