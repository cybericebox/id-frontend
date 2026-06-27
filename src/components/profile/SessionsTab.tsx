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
import { Spinner } from "@/components/ui/spinner"
import { apiGet, apiDelete } from "@/api/client"
import { t } from "@/i18n/t"
import type { SessionInfo } from "./types"
import { extractError } from "./ProfileTab"

// osFromUA derives a human OS/platform label from a user-agent string. The raw
// UA is noise to users; the OS is what they recognize a session by.
function osFromUA(ua: string): string {
  if (!ua) return t("profile.sessions.unknownDevice")
  if (/windows/i.test(ua)) return "Windows"
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS"
  if (/android/i.test(ua)) return "Android"
  if (/mac os x|macintosh/i.test(ua)) return "macOS"
  if (/cros/i.test(ua)) return "ChromeOS"
  if (/linux/i.test(ua)) return "Linux"
  return t("profile.sessions.unknownDevice")
}

export function SessionsTab() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErrorMsg(null)
    setIsLoading(true)
    try {
      const data = await apiGet<SessionInfo[]>("/api/auth/sessions")
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
      await apiDelete(`/api/auth/sessions/${encodeURIComponent(id)}`)
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
      await apiDelete("/api/auth/sessions")
      await load()
    } catch (err) {
      setErrorMsg(extractError(err))
    } finally {
      setBusyId(null)
    }
  }

  const hasOthers = sessions.some((s) => !s.IsCurrent)

  return (
    <Card className="frost-panel">
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
          <div className="flex justify-center py-6">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
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
                    {osFromUA(s.UserAgent)}
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
