"use client"

import React, { useState } from "react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "@/components/ui/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiDelete, apiUrl } from "@/api/client"
import { GoogleIcon } from "@/components/auth/parts"
import { t } from "@/i18n/t"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"
import { ReauthPasswordField } from "./ReauthPasswordField"

export function ConnectionsTab({
  account,
  linkError,
  onUpdated,
}: {
  account: Account
  linkError: boolean
  onUpdated: () => void
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(() =>
    linkError ? t("profile.connections.linkFailed") : null
  )
  const [isBusy, setIsBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmError, setConfirmError] = useState("")
  const [password, setPassword] = useState("")

  const hasGoogle = account.Providers.includes("google")
  // Without a password Google is the only way in: the backend refuses too.
  const onlyMethod = !account.HasPassword && account.Providers.length <= 1

  const unlink = async () => {
    setErrorMsg(null)
    setConfirmError("")
    setIsBusy(true)
    try {
      await apiDelete(
        "/api/auth/google/link",
        undefined,
        undefined,
        account.HasPassword ? { CurrentPassword: password } : undefined
      )
      setPassword("")
      setConfirmOpen(false)
      onUpdated()
      toast.success(t("profile.connections.unlinked"))
    } catch (err) {
      // 4xx lockout-guard (last login method) surfaces here — show, don't crash.
      setConfirmError(extractError(err))
    } finally {
      setIsBusy(false)
    }
  }

  const connect = () => {
    // GET endpoint sets the intent cookie, runs OAuth, and returns to /profile.
    window.location.href = apiUrl("/api/auth/google/link")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.connections.title")}</CardTitle>
        <CardDescription>
          {t("profile.connections.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <GoogleIcon />
            {hasGoogle
              ? t("profile.connections.googleConnected")
              : t("profile.connections.googleNotConnected")}
          </span>
          {hasGoogle ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setConfirmError(""); setPassword(""); setConfirmOpen(true) }}
              disabled={isBusy}
            >
              {t("profile.connections.unlink")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={connect}>
              {t("profile.connections.connect")}
            </Button>
          )}
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          tone="danger"
          busy={isBusy}
          disabled={onlyMethod || (account.HasPassword && !password)}
          error={onlyMethod ? t("profile.connections.unlinkOnlyMethod") : confirmError}
          title={t("profile.connections.unlinkTitle")}
          description={t("profile.connections.unlinkBody")}
          confirmLabel={t("profile.connections.unlink")}
          onConfirm={() => void unlink()}
        >
          {account.HasPassword && !onlyMethod && (
            <ReauthPasswordField
              id="unlink-google-password"
              hint={t("profile.connections.unlinkPasswordHint")}
              value={password}
              onChange={setPassword}
              disabled={isBusy}
            />
          )}
        </ConfirmDialog>
      </CardContent>
    </Card>
  )
}
