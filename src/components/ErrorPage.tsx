"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy } from "lucide-react"

import { FeedbackLink } from "@/components/FeedbackLink"
import { CREST_SRC } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { errorCode } from "@/components/ui/load-error"
import { t } from "@/i18n/t"
import { errorKind, reference, reportHref } from "@/lib/errorReport"
import { cn } from "@/utils/cn"
import "@/components/ui/error-page.css"

const HOME = "/sign-in"

// Browser history back; a tab opened straight on the failing page goes home instead.
export function goBack() {
  if (window.history.length > 1) window.history.back()
  // a full load leaves the failed render state behind
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  else window.location.assign("/")
}

/**
 * The one error / not-found screen of the app (DS patterns/error-page): big muted status, title,
 * one line, actions and, for errors with a platform code, «Код помилки: {code}».
 * `page` — the shell could not render (global error, route-level not found): centred in the viewport
 * with the thin footer. `block` — the shell is there and only the content failed: the same column
 * in the content area, no footer, no crest.
 */
function Reference({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => setCopied(true), () => {})
  }
  return (
    <p className="ib-error__ref">
      {t("error.report.reference", { ref: value })}
      <button type="button" onClick={copy} aria-label={t("error.report.copy")} className="ml-1 inline-flex size-6 items-center justify-center rounded align-middle text-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action">
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      </button>
      <span className="sr-only" role="status">{copied ? t("error.report.copied") : ""}</span>
    </p>
  )
}

export function ErrorPage({ status, title, body, onRetry, error, report = false, mode = "page", fill = false }: {
  status: number
  title: string
  body: string
  /** Retry action; without it the primary action goes home (not-found). */
  onRetry?: () => void
  /** API error: its numeric platform code shows as «Код помилки». */
  error?: unknown
  /** A 500 screen: the «Повідомити деталі» link and, for a journaled 5xx, the reference number. */
  report?: boolean
  mode?: "page" | "block"
  fill?: boolean
}) {
  const page = mode === "page"
  const code = errorCode(error)
  const ref = report ? reference(error) : undefined
  const Title = page ? "h1" : "h2"
  const column = (
    <>
      <p className="ib-error__code" aria-hidden="true">{status}</p>
      <Title className="ib-error__title">{title}</Title>
      <p className="ib-error__text">{body}</p>
      <div className="ib-error__actions">
        {onRetry
          ? <Button onClick={onRetry}>{t("error.load.retry")}</Button>
          : <Button asChild><Link href={HOME}>{t("error.goHome")}</Link></Button>}
        <Button variant="link" onClick={goBack}>{t("error.page.back")}</Button>
      </div>
      {ref ? <Reference value={ref} /> : code !== undefined && <p className="ib-error__ref">{t("error.load.code", { code })}</p>}
      {report && typeof window !== "undefined" && <Button asChild variant="link"><a href={reportHref(error, ref)}>{t("error.report.link")}</a></Button>}
    </>
  )
  if (!page) {
    return (
      <div role="alert" className={cn("ib-error ib-error--block", fill && "ib-error--fill")}>
        <div className="ib-error__main">{column}</div>
      </div>
    )
  }
  return (
    <div className="ib-error ib-error--page">
      <main id="main" tabIndex={-1} className="ib-error__main">{column}</main>
      <footer className="ib-error__footer">
        <Link className="ib-error__brand" href={HOME}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CREST_SRC} width={18} height={18} alt="" />{t("meta.brand")}
        </Link>
        <nav className="ib-error__links" aria-label={t("error.page.nav")}>
          <Link href={HOME}>{t("error.goHome")}</Link>
          <FeedbackLink />
        </nav>
      </footer>
    </div>
  )
}

/** The failed-load screen: 500 (an error boundary, a page whose load failed). */
export function ErrorScreen({ onRetry, title = t("error.page.title"), error, mode }: { onRetry: () => void; title?: string; error?: unknown; mode?: "page" | "block" }) {
  const body = errorKind(error) === "reported" ? t("error.page.bodyReported") : t("error.page.body")
  return <ErrorPage status={500} title={title} body={body} onRetry={onRetry} error={error} report mode={mode} />
}

/** «Not found» (404): app/not-found.tsx, or an in-shell «item not found» with a context title. */
export function NotFoundScreen({ title = t("error.notFound"), body = t("error.notFoundDescription"), mode }: { title?: string; body?: string; mode?: "page" | "block" }) {
  return <ErrorPage status={404} title={title} body={body} mode={mode} />
}
