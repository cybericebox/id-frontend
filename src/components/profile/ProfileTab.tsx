"use client"

import { functionalAllowed } from "@/lib/consent"
import React, { useState, useRef, useEffect } from "react"
import { useForm, useWatch, type SubmitHandler } from "react-hook-form"
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"
import { FormError, reportFormError } from "@/components/ui/form-error"
import { apiPatch, apiUrl, mediaUrl } from "@/api/client"
import { uploadWithProgress } from "@/api/upload"
import { localizedError, localizedResponseError } from "@/i18n/apiError"
import { t } from "@/i18n/t"
import { initials } from "@/lib/initials"
import type { Account } from "./types"

import { AvatarCropDialog } from "./AvatarCropDialog"
import { profileNameDraftKey } from "@/lib/storageKeys"
import { fitImage, fitImageMaxSide } from "@/lib/fitImage"

const ProfileSchema = z.object({
  FirstName: z.string().min(1, { message: t("validation.required") }).max(255),
  LastName: z.string().min(1, { message: t("validation.required") }).max(255),
})

type ProfileValues = z.infer<typeof ProfileSchema>

const sameProfile = (left: ProfileValues, right: ProfileValues) =>
  left.FirstName === right.FirstName && left.LastName === right.LastName

export function ProfileTab({
  account,
  onUpdated,
}: {
  account: Account
  onUpdated: () => void
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  // "prepare": the picked picture is being shrunk; "upload": the cropped photo is on its way (progress in %, null
  // until the browser reports it)
  const [photoAction, setPhotoAction] = useState<"prepare" | "upload" | "remove" | null>(null)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeError, setRemoveError] = useState("")
  const isPhotoBusy = photoAction !== null
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [baseline, setBaseline] = useState<ProfileValues>({ FirstName: account.FirstName, LastName: account.LastName })
  const baselineRef = useRef(baseline)
  const accountNamesRef = useRef(baseline)
  const submittingRef = useRef(false)
  const draftKey = profileNameDraftKey(account.ID)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    mode: "onTouched",
    defaultValues: { FirstName: account.FirstName, LastName: account.LastName },
  })
  const values = useWatch({ control: form.control })
  const dirty = values.FirstName !== baseline.FirstName || values.LastName !== baseline.LastName

  // Draft persistence: restore on mount, then persist edits continuously so the
  // in-progress name survives an auth redirect (the client auto-redirects on 401).
  // Cleared on a successful save.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey)
      // keepDefaultValues: the restored text counts as a change against the saved name, so Save stays enabled
      if (raw) form.reset(JSON.parse(raw), { keepDefaultValues: true })
    } catch {
      /* ignore */
    }
    const sub = form.watch((values) => {
      try {
        // drafts are functional storage: written only with functional consent
        if (functionalAllowed()) sessionStorage.setItem(draftKey, JSON.stringify(values))
      } catch {
        /* ignore */
      }
    })
    return () => sub.unsubscribe()
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [])

  // Refreshed server names become the new baseline; a local draft survives the refresh.
  useEffect(() => {
    const next = { FirstName: account.FirstName, LastName: account.LastName }
    if (sameProfile(next, accountNamesRef.current)) return
    accountNamesRef.current = next
    const keepValues = !sameProfile(form.getValues(), baselineRef.current)
    baselineRef.current = next
    setBaseline(next)
    form.reset(next, { keepValues })
  }, [account.FirstName, account.LastName, form])

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024

  const onPickPhoto = () => fileInputRef.current?.click()

  // Validate the picked file, then open the crop editor. Upload happens only
  // after the user confirms the crop (onCropConfirm).
  const onPhotoChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!picked) return

    setPhotoError(null)
    if (!picked.type.startsWith("image/")) {
      setPhotoError(t("profile.profile.photoInvalidType"))
      return
    }
    // Oversized pictures are shrunk first; the size limit applies to the result.
    setPhotoAction("prepare")
    let file: File
    try {
      file = await fitImage(picked)
    } finally {
      setPhotoAction(null)
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t("profile.profile.photoTooLarge"))
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
    setPhotoError(null)
    setPhotoAction("upload")
    setUploadPercent(null)
    try {
      const fd = new FormData()
      fd.append("file", blob, "avatar.jpg")
      // Multipart body (the browser sets the Content-Type boundary) on the API origin, with upload progress.
      const res = await uploadWithProgress("/api/auth/account/avatar", fd, setUploadPercent)
      if (!res.ok) {
        setPhotoError(await localizedResponseError(res))
        return
      }
      toast.success(t("profile.profile.photoUpdated"))
      onUpdated()
    } catch (err) {
      reportFormError(err, setPhotoError)
    } finally {
      setPhotoAction(null)
    }
  }

  // Runs from the confirmation dialog; its errors stay in the dialog.
  const onRemovePhoto = async () => {
    setPhotoError(null)
    setRemoveError("")
    setPhotoAction("remove")
    try {
      const res = await fetch(apiUrl("/api/auth/account/avatar"), {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        setRemoveError(await localizedResponseError(res))
        return
      }
      setRemoveOpen(false)
      toast.success(t("profile.profile.photoRemoved"))
      onUpdated()
    } catch (err) {
      reportFormError(err, setRemoveError)
    } finally {
      setPhotoAction(null)
    }
  }

  const onSubmit: SubmitHandler<ProfileValues> = async (data) => {
    if (submittingRef.current || sameProfile(data, baselineRef.current)) return
    submittingRef.current = true
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      await apiPatch("/api/auth/account/profile", {
        FirstName: data.FirstName,
        LastName: data.LastName,
      })
      const keepValues = !sameProfile(form.getValues(), data)
      baselineRef.current = data
      setBaseline(data)
      form.reset(data, { keepValues })
      // A newer draft still needs to survive an auth redirect.
      try {
        if (keepValues) { if (functionalAllowed()) sessionStorage.setItem(draftKey, JSON.stringify(form.getValues())) }
        else sessionStorage.removeItem(draftKey)
      } catch { /* storage may be unavailable */ }
      toast.success(t("profile.profile.saved"))
      onUpdated()
    } catch (err) {
      // A 401 is auto-redirected by the api client (the draft is already persisted).
      reportFormError(err, setErrorMsg)
    } finally {
      submittingRef.current = false
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
              aria-invalid={Boolean(photoError)}
              aria-describedby={photoError ? "profile-photo-error" : undefined}
              onChange={(e) => void onPhotoChosen(e)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-describedby={photoError ? "profile-photo-error" : undefined}
                onClick={onPickPhoto}
                disabled={isPhotoBusy}
                busy={photoAction === "prepare" || photoAction === "upload"}
                busyLabel={photoAction === "prepare"
                  ? t("common.busy.preparingPhoto")
                  : uploadPercent === null ? t("common.busy.uploading") : t("common.busy.uploadingPercent", { percent: uploadPercent })}
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
                  onClick={() => { setRemoveError(""); setRemoveOpen(true) }}
                  disabled={isPhotoBusy}
                >
                  {t("profile.profile.removePhoto")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("profile.images.autoShrink", { side: fitImageMaxSide })}</p>
            {photoError && <p id="profile-photo-error" role="alert" className="text-xs font-medium text-destructive">{photoError}</p>}
          </div>
        </div>

        <ConfirmDialog
          open={removeOpen}
          onCancel={() => setRemoveOpen(false)}
          tone="danger"
          busy={photoAction === "remove"}
          busyLabel={t("common.busy.removing")}
          error={removeError}
          title={t("profile.profile.removePhotoTitle")}
          description={t("profile.profile.removePhotoBody")}
          confirmLabel={t("profile.profile.removePhotoConfirm")}
          onConfirm={() => void onRemovePhoto()}
        />

        <AvatarCropDialog
          open={cropSrc !== null}
          imageSrc={cropSrc}
          onCancel={closeCropper}
          onConfirm={onCropConfirm}
        />

        <FormError message={errorMsg} />

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

            <div className="flex min-h-10 flex-wrap gap-2">
              <Button
                type="submit"
                disabled={!dirty}
                busy={isSubmitting}
                busyLabel={t("common.busy.saving")}
              >
                {t("profile.profile.save")}
              </Button>
              {dirty && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset()}
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
