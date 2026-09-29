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
import { toast } from "@/components/ui/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingArea } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { apiGet, apiDelete } from "@/api/client"
import { t, locale } from "@/i18n/t"
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

// browserFromUA derives a human browser label from a user-agent string.
function browserFromUA(ua: string): string {
  if (!ua) return t("profile.sessions.unknownBrowser")
  if (/cybericebox/i.test(ua)) return "Cyber ICE Box CLI"
  const edge = ua.match(/Edg\/(\d+)/)
  if (edge) return `Edge ${edge[1]}`
  const opera = ua.match(/OPR\/(\d+)/)
  if (opera) return `Opera ${opera[1]}`
  const firefox = ua.match(/Firefox\/(\d+)/)
  if (firefox) return `Firefox ${firefox[1]}`
  const chrome = ua.match(/Chrome\/(\d+)/)
  if (chrome) return `Chrome ${chrome[1]}`
  const safari = ua.match(/Version\/(\d+).*Safari/)
  if (safari) return `Safari ${safari[1]}`
  return t("profile.sessions.unknownBrowser")
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  })
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
      toast.success(t("profile.sessions.revoked"))
    } catch (err) {
      toast.error(extractError(err))
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
      toast.success(t("profile.sessions.revokedOthers"))
    } catch (err) {
      toast.error(extractError(err))
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

        {/* One block for loading / empty / list: same min height, states centered. */}
        {isLoading ? (
          <LoadingArea label={t("common.loading")} />
        ) : sessions.length === 0 ? (
          <EmptyState message={t("profile.sessions.empty")} />
        ) : (
          <ul className="max-h-96 min-h-40 space-y-3 overflow-y-auto pr-1">
            {sessions.map((s) => (
              <li key={s.ID} className="rounded-md border p-3">
                {/* Line 1: browser · OS (+ current badge) on the left, revoke
                    button only in the top-right of this row. */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold">
                    <span>{browserFromUA(s.UserAgent)} · {osFromUA(s.UserAgent)}</span>
                    {s.IsCurrent && (
                      <span className="rounded-sm bg-soft px-2 py-0.5 text-xs font-medium text-ink">
                        {t("profile.sessions.current")}
                      </span>
                    )}
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
                </div>

                {/* Meta: IP · last activity, created — full width below. */}
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {s.IP} · {t("profile.sessions.lastActivity")}: {formatDate(s.LastSeen)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("profile.sessions.createdAt")}: {formatDate(s.CreatedAt)}
                </div>
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
