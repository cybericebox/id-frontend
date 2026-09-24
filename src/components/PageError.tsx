"use client"

import { TriangleAlert } from "lucide-react"

import { Wordmark } from "@/components/brand/Wordmark"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"

/**
 * Full-page load failure (the API answered with an error), same centered
 * layout as 404 / sign-out, with a manual retry. An unreachable backend is NOT
 * handled here — the app-wide ServiceStatusGate covers that.
 */
export function PageError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-6 flex justify-center">
          <Wordmark size="lg" />
        </div>
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-8 text-center"
        >
          <TriangleAlert size={32} className="text-danger" aria-hidden />
          <h1 className="text-lg font-semibold">{t("error.loadFailedTitle")}</h1>
          <p className="text-sm text-dim">{t("profile.loadError")}</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            {t("error.retry")}
          </Button>
        </div>
      </div>
    </main>
  )
}
