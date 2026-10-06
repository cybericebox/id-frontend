"use client"

import React, { useEffect, useRef, useState } from "react"

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
import { LoadingArea } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadError } from "@/components/ui/load-error"
import { apiGet, apiDelete } from "@/api/client"
import { BRAND } from "@/i18n/brand"
import { t, locale } from "@/i18n/t"
import type { SessionInfo } from "./types"
import { extractError } from "./ProfileTab"
import { createSessionsStore, type SessionsState } from "./sessionsStore"

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
  if (/cybericebox/i.test(ua)) return `${BRAND} CLI`
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
  const [state, setState] = useState<SessionsState>({ sessions: [], loading: true, loadError: null })
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmError, setConfirmError] = useState("")
  // «Завершити» on one row asks first, like «Завершити всі інші сесії»
  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null)
  const [revokeBusy, setRevokeBusy] = useState(false)
  const [revokeError, setRevokeError] = useState("")
  const storeRef = useRef<ReturnType<typeof createSessionsStore> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createSessionsStore(
      {
        list: () => apiGet<SessionInfo[]>("/api/auth/sessions"),
        revokeOne: (id) => apiDelete(`/api/auth/sessions/${encodeURIComponent(id)}`),
        revokeAll: () => apiDelete("/api/auth/sessions"),
      },
      setState,
    )
  }
  const store = storeRef.current
  const { sessions, loading: isLoading, loadError } = state

  useEffect(() => {
    void store.load()
  }, [store])

  const revokeOne = async (id: string) => {
    setRevokeBusy(true)
    setRevokeError("")
    try {
      await store.revokeOne(id)
      setRevokeTarget(null)
      toast.success(t("profile.sessions.revoked"))
    } catch (err) {
      setRevokeError(extractError(err))
    } finally {
      setRevokeBusy(false)
    }
  }

  const revokeAll = async () => {
    setConfirmBusy(true)
    setConfirmError("")
    try {
      await store.revokeAll()
      setConfirmOpen(false)
      toast.success(t("profile.sessions.revokedOthers"))
    } catch (err) {
      setConfirmError(extractError(err))
    } finally {
      setConfirmBusy(false)
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
        {/* One block for loading / error / empty / list: same min height, states centered. */}
        {isLoading ? (
          <LoadingArea label={t("common.loading")} />
        ) : loadError ? (
          <LoadError message={t("profile.sessions.loadError")} error={loadError} onRetry={() => { void store.load() }} />
        ) : sessions.length === 0 ? (
          <EmptyState message={t("profile.sessions.empty")} />
        ) : (
          <ul aria-label={t("profile.sessions.list")} className="min-h-40 space-y-3">
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
                      aria-label={t("profile.sessions.revokeLabel", { device: `${browserFromUA(s.UserAgent)} · ${osFromUA(s.UserAgent)}` })}
                      onClick={() => { setRevokeError(""); setRevokeTarget(s) }}
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
            onClick={() => { setConfirmError(""); setConfirmOpen(true) }}
          >
            {t("profile.sessions.revokeAll")}
          </Button>
        )}
        <ConfirmDialog
          open={revokeTarget !== null}
          onCancel={() => setRevokeTarget(null)}
          tone="danger"
          busy={revokeBusy}
          error={revokeError}
          title={t("profile.sessions.revokeOneTitle")}
          description={revokeTarget ? <>{t("profile.sessions.revokeOneBody")} <b className="font-medium text-ink">{browserFromUA(revokeTarget.UserAgent)} · {osFromUA(revokeTarget.UserAgent)}</b></> : undefined}
          confirmLabel={t("profile.sessions.revokeOneConfirm")}
          onConfirm={() => { if (revokeTarget) void revokeOne(revokeTarget.ID) }}
        />
        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          tone="danger"
          busy={confirmBusy}
          error={confirmError}
          title={t("profile.sessions.revokeAllTitle")}
          description={t("profile.sessions.revokeAllBody")}
          confirmLabel={t("profile.sessions.revokeAllConfirm")}
          onConfirm={() => void revokeAll()}
        />
      </CardContent>
    </Card>
  )
}
