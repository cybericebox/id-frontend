"use client"

import React, { useState } from "react"
import { Download } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { FormError, fieldErrorMessage } from "@/components/ui/form-error"
import { toast } from "@/components/ui/toast"
import { apiUrl, apiDelete, ApiError } from "@/api/client"
import { redirectToSignIn } from "@/lib/auth"
import { t } from "@/i18n/t"
import { COOKIE_POLICY_HREF } from "@/components/CookieSettingsLink"
import { LegalLinks } from "@/components/PageFooter"
import { inlineLinkClass } from "@/components/auth/parts"
import { openConsentSettings } from "@/lib/consent"
import { localizedError } from "@/i18n/apiError"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"
import { ReauthPasswordField } from "./ReauthPasswordField"

// GET answers with the file itself (application/json, Content-Disposition: attachment), not the usual envelope.
// A sign-in older than 15 minutes is refused (403, code 60429): the person signs in again and comes back here.
const EXPORT_PATH = "/api/auth/account/export"
const EXPORT_FALLBACK_FILE = "cyber-ice-box-my-data.json"
const REAUTH_REQUIRED = 60429

function fileNameOf(res: Response): string {
  const match = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") ?? "")
  return match?.[1] ?? EXPORT_FALLBACK_FILE
}

async function downloadMyData(): Promise<void> {
  const res = await fetch(apiUrl(EXPORT_PATH), { credentials: "include" })
  if (!res.ok) {
    let body: unknown
    try { body = await res.json() } catch { body = undefined }
    const status = (body as { Status?: { Code?: number; Message?: string } } | undefined)?.Status
    const err = new ApiError(res.status, body, status?.Message, res.headers.get("X-Sign-In-URL") ?? undefined, status?.Code, parseRetryAfter(res.headers.get("Retry-After")))
    if (err.code === REAUTH_REQUIRED || res.status === 401) {
      redirectToSignIn(err.signInUrl, window.location.href)
      return new Promise<never>(() => {})
    }
    throw err
  }
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = fileNameOf(res)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function parseRetryAfter(value: string | null): number | undefined {
  const seconds = value ? Number(value) : NaN
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined
}

function DataExportCard() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      await downloadMyData()
    } catch (err) {
      setError(localizedError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.privacy.exportTitle")}</CardTitle>
        <CardDescription>{t("profile.privacy.exportDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormError message={error} />
        <Button type="button" variant="outline" busy={busy} busyLabel={t("common.busy.preparing")} onClick={() => void download()}>
          <Download aria-hidden="true" />
          {t("profile.privacy.exportButton")}
        </Button>
      </CardContent>
    </Card>
  )
}

function CookiesAndLegalCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.privacy.legalTitle")}</CardTitle>
        <CardDescription>{t("profile.privacy.legalDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <a href={COOKIE_POLICY_HREF} className={inlineLinkClass} onClick={(e) => { e.preventDefault(); openConsentSettings() }}>
          {t("consent.settings")}
        </a>
        <LegalLinks className={inlineLinkClass} />
      </CardContent>
    </Card>
  )
}

export function PrivacyTab({ account }: { account: Account }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null)
  const [deletePassword, setDeletePassword] = useState("")

  const onDelete = async () => {
    setIsDeleting(true)
    setDeleteError("")
    setDeletePasswordError(null)
    try {
      await apiDelete(
        "/api/auth/account",
        undefined,
        undefined,
        account.HasPassword ? { CurrentPassword: deletePassword } : undefined
      )
      toast.success(t("profile.account.deleted"))
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Reload after account deletion to discard authenticated client state.
      window.location.href = "/sign-in/"
    } catch (err) {
      const passwordError = account.HasPassword ? fieldErrorMessage(err, [20410]) : null
      if (passwordError) setDeletePasswordError(passwordError)
      else setDeleteError(extractError(err))
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <DataExportCard />
      <CookiesAndLegalCard />

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
          <Button variant="destructive" onClick={() => { setDeleteError(""); setDeletePasswordError(null); setDeletePassword(""); setDeleteOpen(true) }}>
            {t("profile.account.deleteButton")}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        tone="danger"
        busy={isDeleting}
        busyLabel={t("common.busy.deleting")}
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
            error={deletePasswordError}
            onChange={(value) => { setDeletePassword(value); setDeletePasswordError(null) }}
            disabled={isDeleting}
          />
        )}
      </ConfirmDialog>
    </div>
  )
}
