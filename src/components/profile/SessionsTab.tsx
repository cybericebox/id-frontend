"use client"

import React, { useCallback, useEffect, useState } from "react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiGet, apiPost, apiDelete } from "@/api/client"
import { t } from "@/i18n/t"
import type { SessionInfo } from "./types"
import { extractError } from "./ProfileTab"

export function SessionsTab() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErrorMsg(null)
    setIsLoading(true)
    try {
      const data = await apiGet<SessionInfo[]>("/api/account/sessions")
      setSessions(data ?? [])
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const revokeOne = async (id: string) => {
    setBusyId(id)
    setErrorMsg(null)
    try {
      await apiDelete(`/api/account/sessions/${encodeURIComponent(id)}`)
      await load()
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setBusyId(null)
    }
  }

  const revokeAll = async () => {
    setBusyId("__all__")
    setErrorMsg(null)
    try {
      await apiPost("/api/account/sessions/revoke-all", {})
      await load()
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setBusyId(null)
    }
  }

  const hasOthers = sessions.some((s) => !s.IsCurrent)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.sessions.title")}</CardTitle>
        <CardDescription>{t("profile.sessions.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("profile.sessions.empty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li
                key={s.ID}
                className="flex items-center justify-between gap-4 rounded-md border p-3"
              >
                <div className="min-w-0 text-sm">
                  <div className="truncate font-medium">
                    {s.UserAgent || t("profile.sessions.unknownDevice")}
                    {s.IsCurrent && (
                      <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {t("profile.sessions.current")}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {s.IP} · {t("profile.sessions.lastSeen")}:{" "}
                    {s.LastSeen ? new Date(s.LastSeen).toLocaleString() : "—"}
                  </div>
                </div>
                {!s.IsCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeOne(s.ID)}
                    disabled={busyId === s.ID}
                  >
                    {t("profile.sessions.revoke")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {hasOthers && (
          <Button
            variant="outline"
            onClick={revokeAll}
            disabled={busyId === "__all__"}
          >
            {t("profile.sessions.revokeAll")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
