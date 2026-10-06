"use client"

import Link from "next/link"

import { FeedbackLink } from "@/components/FeedbackLink"
import { CREST_SRC } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { errorCode } from "@/components/ui/load-error"
import { t } from "@/i18n/t"
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
export function ErrorPage({ status, title, body, onRetry, error, mode = "page", fill = false }: {
  status: number
  title: string
  body: string
  /** Retry action; without it the primary action goes home (not-found). */
  onRetry?: () => void
  /** API error: its numeric platform code shows as «Код помилки». */
  error?: unknown
  mode?: "page" | "block"
  fill?: boolean
}) {
  const page = mode === "page"
  const code = errorCode(error)
  const Title = page ? "h1" : "h2"
  const column = (
    <>
      <p className="ib-error__code" aria-hidden="true">{status}</p>
      <Title className="ib-error__title">{title}</Title>
      <p className="ib-error__text">{body}</p>
      <div className="ib-error__actions">
        {onRetry
          ? <Button onClick={onRetry}>{t("error.page.reload")}</Button>
          : <Button asChild><Link href={HOME}>{t("error.goHome")}</Link></Button>}
        <Button variant="link" onClick={goBack}>{t("error.page.back")}</Button>
      </div>
      {code !== undefined && <p className="ib-error__ref">{t("error.load.code", { code })}</p>}
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
  return <ErrorPage status={500} title={title} body={t("error.page.body")} onRetry={onRetry} error={error} mode={mode} />
}

/** «Not found» (404): app/not-found.tsx, or an in-shell «item not found» with a context title. */
export function NotFoundScreen({ title = t("error.notFound"), body = t("error.notFoundDescription"), mode }: { title?: string; body?: string; mode?: "page" | "block" }) {
  return <ErrorPage status={404} title={title} body={body} mode={mode} />
}
