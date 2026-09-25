"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { CloudOff } from "lucide-react"

import { Wordmark } from "@/components/brand/Wordmark"
import { Button } from "@/components/ui/button"
import { apiUrl } from "@/api/client"
import { t } from "@/i18n/t"
import { confirmServiceUnavailable, getServiceStatus, reportServiceAvailable, subscribeServiceStatus } from "@/lib/serviceStatus"

const POLL_MS = 5000
const CONFIRM_MS = 3000

// Probe session validation directly (not via the api client, so a probe
// failure does not re-trigger the overlay logic).
async function probe(): Promise<boolean> {
  try {
    // /api/health can be 200 while session storage is still unavailable.
    const res = await fetch(apiUrl("/api/auth/me"), { cache: "no-store", credentials: "include", signal: AbortSignal.timeout(4000) })
    return res.ok || res.status === 401
  } catch {
    return false
  }
}

/**
 * App-wide interceptor for "backend unreachable" (network failure or
 * 5xx on any API call). Mounted once in the root layout: shows a
 * full-screen notice over the current page, probes /api/auth/me every 5 s and
 * disappears by itself when the API is back (screens refetch via
 * onServiceRestored). The page underneath stays mounted, so form input survives.
 */
export function ServiceStatusGate() {
  const status = useSyncExternalStore(subscribeServiceStatus, getServiceStatus, () => "up" as const)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (status !== "suspect") return
    const id = window.setTimeout(async () => {
      if (await probe()) reportServiceAvailable()
      else confirmServiceUnavailable()
    }, CONFIRM_MS)
    return () => window.clearTimeout(id)
  }, [status])

  useEffect(() => {
    if (status !== "down") return
    const id = window.setInterval(async () => {
      if (await probe()) reportServiceAvailable()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [status])

  if (status !== "down") return null

  const retry = async () => {
    setChecking(true)
    if (await probe()) reportServiceAvailable()
    setChecking(false)
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="service-down-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/95 p-4"
    >
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" href={null} />
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8 text-center">
          <CloudOff size={32} className="text-dim" aria-hidden />
          <h1 id="service-down-title" className="text-lg font-semibold">
            {t("error.unavailableTitle")}
          </h1>
          <p className="text-sm text-dim">{t("error.unavailableBody")}</p>
          <Button variant="outline" size="sm" onClick={retry} disabled={checking} className="mt-2">
            {checking ? t("common.loading") : t("error.retry")}
          </Button>
        </div>
      </div>
    </div>
  )
}
