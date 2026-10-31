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
import { apiGet, apiDelete } from "@/api/client"
import { t } from "@/i18n/t"
import { COOKIE_POLICY_HREF } from "@/components/CookieSettingsLink"
import { LegalLinks } from "@/components/PageFooter"
import { openConsentSettings } from "@/lib/consent"
import { localizedError } from "@/i18n/apiError"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"
import { ReauthPasswordField } from "./ReauthPasswordField"

// GET returns a JSON of everything the platform keeps about the signed-in user.
const EXPORT_PATH = "/api/auth/account/export"
const EXPORT_FILE = "cyber-ice-box-data.json"

function DataExportCard() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await apiGet<unknown>(EXPORT_PATH)
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
      const link = document.createElement("a")
      link.href = url
      link.download = EXPORT_FILE
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
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
        <a href={COOKIE_POLICY_HREF} className="text-action underline-offset-4 hover:underline" onClick={(e) => { e.preventDefault(); openConsentSettings() }}>
          {t("consent.settings")}
        </a>
        <LegalLinks className="text-action underline-offset-4 hover:underline" />
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
