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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiDelete } from "@/api/client"
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
  const [errorMsg, setErrorMsg] = useState<string | null>(
    linkError ? t("profile.connections.linkFailed") : null
  )
  const [isBusy, setIsBusy] = useState(false)

  const hasGoogle = account.Providers.includes("google")

  const unlink = async () => {
    setErrorMsg(null)
    setIsBusy(true)
    try {
      await apiDelete("/api/account/providers/google")
      onUpdated()
    } catch (err) {
      // 4xx lockout-guard (last login method) surfaces here — show, don't crash.
      setErrorMsg(extractError(err))
    } finally {
      setIsBusy(false)
    }
  }

  const connect = () => {
    // GET endpoint sets the intent cookie, runs OAuth, and returns to /profile.
    window.location.href = "/api/account/providers/google"
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
          <span className="text-sm font-medium">
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
