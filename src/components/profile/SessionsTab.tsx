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

interface Geo {
  city: string
  country: string
}

// isPrivateIP skips loopback/LAN/empty addresses — geo lookup is pointless for them.
function isPrivateIP(ip: string): boolean {
  if (!ip) return true
  if (ip === "::1" || ip.startsWith("fe80") || ip.startsWith("fc") || ip.startsWith("fd")) return true
  if (/^127\./.test(ip) || /^10\./.test(ip) || /^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  return false
}

// fetchGeo resolves a public IP to city/country via a free, key-less endpoint.
// Best-effort: returns null on any failure (the row then shows just the IP).
async function fetchGeo(ip: string): Promise<Geo | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`)
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.success || !d?.country) return null
    return { city: d.city ?? "", country: d.country }
  } catch {
    return null
  }
}

function geoLabel(g: Geo | undefined): string {
  if (!g) return ""
  return g.city ? `${g.city}, ${g.country}` : g.country
}

// Cap external geo lookups per render to avoid hammering the API for accounts
// with many sessions across many IPs.
const MAX_GEO_LOOKUPS = 20

export function SessionsTab() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [geo, setGeo] = useState<Record<string, Geo>>({})

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

  // Resolve geo for the sessions' public IPs on the client (no server storage),
  // looking up each unique IP once and caching the result.
  useEffect(() => {
    const ips = Array.from(
      new Set(sessions.map((s) => s.IP).filter((ip) => !isPrivateIP(ip) && !(ip in geo)))
    ).slice(0, MAX_GEO_LOOKUPS)
    if (ips.length === 0) return

    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        ips.map(async (ip) => [ip, await fetchGeo(ip)] as const)
      )
      if (cancelled) return
      setGeo((prev) => {
        const next = { ...prev }
        for (const [ip, g] of entries) if (g) next[ip] = g
        return next
      })
    })()
    return () => {
      cancelled = true
    }
    // geo is intentionally omitted: it's updated here and guarded by the `in geo` filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions])

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
                className="flex justify-between gap-4 rounded-md border p-3"
              >
                {/* Left: device + location/IP (two lines) */}
                <div className="min-w-0 space-y-0.5 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{osFromUA(s.UserAgent)}</span>
                    {s.IsCurrent && (
                      <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {t("profile.sessions.current")}
                      </span>
                    )}
                  </div>
                  <div className="break-words text-muted-foreground">
                    {geoLabel(geo[s.IP]) && `${geoLabel(geo[s.IP])} · `}
                    {s.IP}
                  </div>
                </div>

                {/* Right: last activity (top) + revoke action */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {s.LastSeen ? new Date(s.LastSeen).toLocaleString() : "—"}
                  </span>
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
