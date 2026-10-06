import pkg from "../../package.json"
import { ApiError } from "@/api/client"
import { feedbackHref } from "@/lib/feedback"
import { t } from "@/i18n/t"

// What a 500 page tells the user. A backend 5xx is journaled with a request id (X-Request-ID);
// the user quotes «code-rid8». A frontend crash reaches no backend: nothing is journaled, no number.

export type ErrorKind = "reported" | "api" | "crash"

export function errorKind(error: unknown): ErrorKind {
  if (!(error instanceof ApiError)) return "crash"
  return error.status >= 500 ? "reported" : "api"
}

/** «{code}-{first 8 hex chars of the request id}»; the request id alone when there is no platform code (absent or 0); undefined without a request id. */
export function reference(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || error.status < 500 || !error.requestId) return undefined
  const rid = error.requestId.replace(/-/g, "").slice(0, 8)
  if (!rid) return undefined
  return error.code ? `${error.code}-${rid}` : rid
}

/** mailto: «Повідомити деталі», prefilled with page, time and the reference (API) or the message and build (crash). */
export function reportHref(error: unknown, ref?: string): string {
  const crash = errorKind(error) === "crash"
  const lines = [t("error.report.page", { url: window.location.href }), t("error.report.time", { time: new Date().toISOString() })]
  if (ref) lines.push(t("error.report.ref", { ref }))
  if (crash) {
    const message = error instanceof Error ? error.message.slice(0, 200) : ""
    if (message) lines.push(t("error.report.message", { message }))
    lines.push(t("error.report.build", { app: t("feedback.app"), version: pkg.version }))
  }
  lines.push("", t("error.report.todo"), "")
  const subject = ref ? t("error.report.subject", { ref }) : t("error.report.subjectCrash", { app: t("feedback.app") })
  return feedbackHref(subject, lines.join("\n"))
}
