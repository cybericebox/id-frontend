// Client token (DoS protection). With NEXT_PUBLIC_DOS_PROTECTION=on the first visit passes an invisible
// bot check and the API sets the HttpOnly `__Host-client` cookie (about a day). JS cannot read the cookie,
// so only the expiry is remembered (localStorage, a per-origin convenience; the 429 retry covers a lost cookie).

import { executeCaptcha } from "@/lib/captcha"
import { apiOrigin } from "@/lib/origins"
import { STORAGE_CLIENT_TOKEN_EXPIRES } from "@/lib/storageKeys"

const MARGIN_MS = 60_000
const FAILURE_BACKOFF_MS = 5_000
const MAX_BACKOFF_MS = 60_000
export const CLIENT_TOKEN_ACTION = "clientToken"
export const CLIENT_TOKEN_HEADER = "X-Client-Token"

export function dosProtectionOn(): boolean {
  return ["on"].includes(process.env.NEXT_PUBLIC_DOS_PROTECTION ?? "")
}

let inflight: Promise<void> | null = null
let backendOff = false
let blockedUntil = 0
let memoryExpiry = 0

function readExpiry(): number {
  if (memoryExpiry) return memoryExpiry
  try {
    const raw = localStorage.getItem(STORAGE_CLIENT_TOKEN_EXPIRES)
    const n = raw ? Number(raw) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function writeExpiry(ms: number): void {
  memoryExpiry = ms
  try {
    localStorage.setItem(STORAGE_CLIENT_TOKEN_EXPIRES, String(ms))
  } catch {
    // storage blocked: the in-memory value is enough for this page
  }
}

function backOff(ms: number): void {
  blockedUntil = Date.now() + Math.min(ms, MAX_BACKOFF_MS)
}

async function fetchToken(): Promise<void> {
  try {
    const token = await executeCaptcha(CLIENT_TOKEN_ACTION)
    const res = await fetch(`${apiOrigin}/api/client-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ RecaptchaToken: token }),
    })
    if (res.status === 404) {
      backendOff = true // the backend has DoS protection off: no token needed
      return
    }
    if (res.status === 429) {
      const wait = Number(res.headers.get("Retry-After"))
      backOff(Number.isFinite(wait) && wait > 0 ? wait * 1000 : FAILURE_BACKOFF_MS)
      return
    }
    if (!res.ok) {
      backOff(FAILURE_BACKOFF_MS)
      return
    }
    const body = (await res.json().catch(() => undefined)) as { Data?: { ExpiresAt?: string } } | undefined
    const at = body?.Data?.ExpiresAt ? Date.parse(body.Data.ExpiresAt) : NaN
    if (Number.isFinite(at)) writeExpiry(at)
  } catch {
    backOff(FAILURE_BACKOFF_MS) // captcha or network failure: never block the page
  }
}

/**
 * Makes sure a client token cookie exists before a public API call. One request even for parallel calls;
 * a failure does not block (the original request goes on and shows its own error) and is retried after a back-off.
 */
export function ensureClientToken(opts: { force?: boolean } = {}): Promise<void> {
  if (typeof window === "undefined" || !dosProtectionOn() || backendOff) return Promise.resolve()
  if (inflight) return inflight
  if (!opts.force && readExpiry() - MARGIN_MS > Date.now()) return Promise.resolve()
  if (Date.now() < blockedUntil) return Promise.resolve()
  inflight = fetchToken().finally(() => {
    inflight = null
  })
  return inflight
}

/** True for the 429 that asks for a client token (a plain 429 is an ordinary rate limit). */
export function needsClientToken(res: Response): boolean {
  return res.status === 429 && res.headers.get(CLIENT_TOKEN_HEADER) === "required"
}

/** Test helper: forget all module state. */
export function resetClientTokenForTests(): void {
  inflight = null
  backendOff = false
  blockedUntil = 0
  memoryExpiry = 0
}
