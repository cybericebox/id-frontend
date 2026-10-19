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
import { fieldErrorMessage } from "@/components/ui/form-error"
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
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [connectPasswordError, setConnectPasswordError] = useState<string | null>(null)
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
    setPasswordError(null)
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
      const fieldError = account.HasPassword ? fieldErrorMessage(err, [20410]) : null
      if (fieldError) setPasswordError(fieldError)
      else setConfirmError(extractError(err))
    } finally {
      setIsBusy(false)
    }
  }

  // The backend confirms the owner first, then returns the Google URL; it sets the OAuth cookies and the
  // callback returns to /profile.
  const connect = async () => {
    setErrorMsg(null)
    setConnectError("")
    setConnectPasswordError(null)
    setIsConnecting(true)
    try {
      const url = await startGoogleLink(account.HasPassword ? connectPassword : undefined)
      window.location.href = url
    } catch (err) {
      // A wrong password stays in the dialog; the "sign in again" answer of a password-less account shows here.
      const fieldError = account.HasPassword ? fieldErrorMessage(err, [20410]) : null
      if (fieldError) setConnectPasswordError(fieldError)
      else if (account.HasPassword) setConnectError(extractError(err))
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink [&_svg]:shrink-0">
            <GoogleIcon />
            {hasGoogle
              ? t("profile.connections.googleConnected")
              : t("profile.connections.googleNotConnected")}
          </span>
          {hasGoogle ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setConfirmError(""); setPasswordError(null); setPassword(""); setConfirmOpen(true) }}
              disabled={isBusy || onlyMethod}
              aria-describedby={onlyMethod ? "unlink-only-method" : undefined}
            >
              {t("profile.connections.unlink")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              busy={isConnecting && !account.HasPassword}
              busyLabel={t("common.busy.connecting")}
              disabled={isConnecting}
              onClick={() => {
                if (account.HasPassword) {
                  setConnectError("")
                  setConnectPasswordError(null)
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
        {hasGoogle && onlyMethod && (
          <p id="unlink-only-method" className="text-sm text-dim">{t("profile.connections.unlinkOnlyMethod")}</p>
        )}
        <ConfirmDialog
          open={connectOpen}
          onCancel={() => setConnectOpen(false)}
          busy={isConnecting}
          busyLabel={t("common.busy.connecting")}
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
            error={connectPasswordError}
            onChange={(value) => { setConnectPassword(value); setConnectPasswordError(null) }}
            disabled={isConnecting}
          />
        </ConfirmDialog>
        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          tone="danger"
          busy={isBusy}
          busyLabel={t("common.busy.unlinking")}
          disabled={account.HasPassword && !password}
          error={confirmError}
          title={t("profile.connections.unlinkTitle")}
          description={t("profile.connections.unlinkBody")}
          confirmLabel={t("profile.connections.unlink")}
          onConfirm={() => void unlink()}
        >
          {account.HasPassword && (
            <ReauthPasswordField
              id="unlink-google-password"
              hint={t("profile.connections.unlinkPasswordHint")}
              value={password}
              error={passwordError}
              onChange={(value) => { setPassword(value); setPasswordError(null) }}
              disabled={isBusy}
            />
          )}
        </ConfirmDialog>
      </CardContent>
    </Card>
  )
}
