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
import { toast } from "@/components/ui/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiDelete, apiUrl } from "@/api/client"
import { GoogleIcon } from "@/components/auth/parts"
import { t } from "@/i18n/t"
import type { Account } from "./types"
import { extractError } from "./ProfileTab"

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

  const hasGoogle = account.Providers.includes("google")

  const unlink = async () => {
    setErrorMsg(null)
    setIsBusy(true)
    try {
      await apiDelete("/api/auth/google/link")
      onUpdated()
      toast.success("Google-акаунт від’єднано.")
    } catch (err) {
      // 4xx lockout-guard (last login method) surfaces here — show, don't crash.
      toast.error(extractError(err))
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
              onClick={unlink}
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
      </CardContent>
    </Card>
  )
}
