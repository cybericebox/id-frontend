"use client"

import { TriangleAlert } from "lucide-react"

import { Wordmark } from "@/components/brand/Wordmark"
import { Button } from "@/components/ui/button"
import { errorCode } from "@/components/ui/load-error"
import { t } from "@/i18n/t"

// Browser history back; a tab opened straight on the failing page goes home instead.
export function goBack() {
  if (window.history.length > 1) window.history.back()
  // a full load leaves the failed render state behind
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  else window.location.assign("/")
}

/**
 * Error boundary screen (app/error.tsx, app/global-error.tsx) and a full-page load
 * failure: warning mark, «Оновити» (retry) and «Назад». Shows only the numeric error code (when `error` carries one), never details.
 */
export function ErrorScreen({ onRetry, title = t("error.page.title"), error }: { onRetry: () => void; title?: string; error?: unknown }) {
  const code = errorCode(error)
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </div>
        <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8 text-center">
          <TriangleAlert size={32} className="text-danger" aria-hidden />
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-dim">{t("error.page.body")}</p>
          {code !== undefined && <p className="font-mono text-xs text-dim">{t("error.load.code", { code })}</p>}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button onClick={onRetry}>{t("error.page.reload")}</Button>
            <Button variant="outline" onClick={goBack}>{t("error.page.back")}</Button>
          </div>
        </div>
      </div>
    </main>
  )
}
