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
import { apiDelete } from "@/api/client"
import { startGoogleLink } from "@/api/googleLink"
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
  const [connectOpen, setConnectOpen] = useState(false)
  const [connectError, setConnectError] = useState("")
  const [connectPassword, setConnectPassword] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

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

  // The backend confirms the owner first, then returns the Google URL; it sets the OAuth cookies and the
  // callback returns to /profile.
  const connect = async () => {
    setErrorMsg(null)
    setConnectError("")
    setIsConnecting(true)
    try {
      const url = await startGoogleLink(account.HasPassword ? connectPassword : undefined)
      window.location.href = url
    } catch (err) {
      // A wrong password stays in the dialog; the "sign in again" answer of a password-less account shows here.
      if (account.HasPassword) setConnectError(extractError(err))
      else setErrorMsg(extractError(err))
      setIsConnecting(false)
    }
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
            <Button
              variant="outline"
              size="sm"
              busy={isConnecting && !account.HasPassword}
              disabled={isConnecting}
              onClick={() => {
                if (account.HasPassword) {
                  setConnectError("")
                  setConnectPassword("")
                  setConnectOpen(true)
                } else {
                  void connect()
                }
              }}
            >
              {t("profile.connections.connect")}
            </Button>
          )}
        </div>
        <ConfirmDialog
          open={connectOpen}
          onCancel={() => setConnectOpen(false)}
          busy={isConnecting}
          disabled={!connectPassword}
          error={connectError}
          title={t("profile.connections.connectTitle")}
          description={t("profile.connections.connectBody")}
          confirmLabel={t("profile.connections.connect")}
          onConfirm={() => void connect()}
        >
          <ReauthPasswordField
            id="connect-google-password"
            hint={t("profile.connections.connectPasswordHint")}
            value={connectPassword}
            onChange={setConnectPassword}
            disabled={isConnecting}
          />
        </ConfirmDialog>
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
