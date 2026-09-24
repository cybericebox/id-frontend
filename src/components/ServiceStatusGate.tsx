"use client"

import { useEffect, useState } from "react"
import { CloudOff } from "lucide-react"

import { Wordmark } from "@/components/brand/Wordmark"
import { Button } from "@/components/ui/button"
import { apiUrl } from "@/api/client"
import { t } from "@/i18n/t"
import { reportServiceAvailable, subscribeServiceStatus } from "@/lib/serviceStatus"

const POLL_MS = 5000

// Probe the public liveness route directly (not via the api client, so a probe
// failure does not re-trigger the overlay logic).
async function probe(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/health"), { cache: "no-store" })
    return res.ok
  } catch {
    return false
  }
}

/**
 * App-wide interceptor for "backend unreachable" (network failure or
 * 502/503/504 on any API call). Mounted once in the root layout: shows a
 * full-screen notice over the current page, polls /api/health every 5 s and
 * disappears by itself when the API is back (screens refetch via
 * onServiceRestored). The page underneath stays mounted, so form input survives.
 */
export function ServiceStatusGate() {
  const [down, setDown] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => subscribeServiceStatus(setDown), [])

  useEffect(() => {
    if (!down) return
    const id = window.setInterval(async () => {
      if (await probe()) reportServiceAvailable()
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [down])

  if (!down) return null

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
