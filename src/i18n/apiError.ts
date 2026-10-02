// Localize an API error by its stable numeric code (Status.Code), NOT by the
// backend's English Status.Message. The backend is the source of truth for codes
// and English text (messages/errors.en.json is generated from it); uk overrides
// per code. Resolution: uk → en → generic. A non-API error (network/parse) or an
// error without a code falls back to the generic UI-language message.
//
// errors.uk.json is intentionally partial: codes without a uk entry fall through
// to the English catalog until translated.
import errorsUk from "../../messages/errors.uk.json"
import errorsEn from "../../messages/errors.en.json"
import { ApiError } from "@/api/client"
import { isUnavailableStatus } from "@/lib/serviceStatus"
import { t } from "./t"

const uk = errorsUk as Record<string, string>
const en = errorsEn as Record<string, string>

/**
 * isServiceUnavailable — the backend could not be reached or its gateway failed
 * (5xx, or fetch() itself rejected: DNS, connection refused, offline).
 * Callers show a "temporarily unavailable, retrying" state instead of a generic
 * error for these.
 */
export function isServiceUnavailable(err: unknown): boolean {
  if (err instanceof ApiError) return isUnavailableStatus(err.status)
  return err instanceof TypeError // fetch() network failure
}

// AuthTooManyRequests (HTTP 429) and the bodiless 429 of the rate limiter: the wait comes from Retry-After.
const CODE_TOO_MANY_REQUESTS = 70428

/** waitText — a wait in seconds as «N с» / «N хв» (minutes rounded up). */
export function waitText(seconds: number): string {
  return seconds < 60
    ? t("error.wait.seconds", { n: Math.max(1, Math.ceil(seconds)) })
    : t("error.wait.minutes", { n: Math.ceil(seconds / 60) })
}

export function localizedError(err: unknown): string {
  if (isServiceUnavailable(err)) return t("error.unavailable")
  // The general rate limiter answers 429 with an empty body (no code) and Retry-After.
  if (err instanceof ApiError && (err.code === CODE_TOO_MANY_REQUESTS || (err.status === 429 && err.code == null))) {
    return err.retryAfter
      ? t("error.tooManyRetry", { wait: waitText(err.retryAfter) })
      : t("error.tooMany")
  }
  if (err instanceof ApiError && err.code != null) {
    const key = String(err.code)
    const msg = uk[key] ?? en[key]
    if (msg) return msg
  }
  return t("error.generic")
}

/** Localize a raw fetch() error envelope ({ Status: { Code } }) — for the multipart
 *  avatar calls that bypass the api client. */
export async function localizedResponseError(res: Response): Promise<string> {
  try {
    const env = await res.json()
    const code = env?.Status?.Code
    return localizedError(new ApiError(res.status, env, undefined, undefined, typeof code === "number" ? code : undefined))
  } catch {
    return t("error.generic")
  }
}
