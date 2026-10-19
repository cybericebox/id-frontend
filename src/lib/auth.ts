/**
 * src/lib/auth.ts — Shared Design-System auth-state client helpers.
 *
 * COPY-TO-RP-APPS: This module is app-agnostic and static-export-safe.
 * Copy it verbatim into any Relying-Party (RP) frontend (e.g. main-frontend)
 * as part of the DS sync procedure (see README).
 *
 * Usage on id-frontend (the Authorization Server):
 *   - `fetchMe` / `Me` are used for auth-state checks.
 *   - `rememberReturnTo` is called on mount by each auth page to persist the
 *     cib_return_to cookie, which the backend consumes at session creation.
 *   - `safeReturnTo` / `redirectIfAuthed` guard guest-only pages.
 *
 * No JSX — plain TypeScript; safe to import without 'use client' propagation issues.
 */

import { hosts } from "@/lib/hosts"
import { apiGet, ApiError } from "@/api/client"
import { COOKIE_RETURN_TO } from "@/lib/storageKeys"

// ---------------------------------------------------------------------------
// /me — identity object returned by the RP's /api/me endpoint.
// On id itself the equivalent is /api/account (different shape), but RP apps
// expose /api/me as a lightweight signed-in check.
// ---------------------------------------------------------------------------

export interface Me {
  FirstName: string
  LastName: string
  Email: string
  Role: string
  // Avatar URL — the backend's UserInfo field is "Picture".
  Picture?: string
}

/**
 * fetchMe — GET /api/me with credentials included.
 *
 * Returns the `Me` object on 200 (signed in), or `null` on 401 (no session).
 * Throws only on unexpected errors (5xx, network failures, etc.).
 *
 * DS NOTE: RP apps call this on every page load to determine auth state.
 */
export async function fetchMe(): Promise<Me | null> {
  try {
    // required:false → 401 is "anonymous" (not a redirect).
    return await apiGet<Me>("/api/auth/me", undefined, { required: false })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null
    }
    throw err
  }
}

/**
 * Redirect to the sign-in page, preserving where to return after auth. Prefer
 * the backend-advertised URL (ApiError.signInUrl from the X-Sign-In-URL header)
 * so the address isn't hardcoded; fall back to the local /sign-in. The return_to
 * is appended here because only the client knows the current page URL.
 */
export function redirectToSignIn(signInUrl?: string, returnTo?: string): void {
  if (typeof window === "undefined") return
  const ret = returnTo ?? window.location.href
  const base = signInUrl || "/sign-in/"
  const url = new URL(base, window.location.origin)
  url.searchParams.set("return_to", ret)
  window.location.href = url.toString()
}

// Our sites only, as strict as backLink.classifyBack: the landing, id, admin and exercises hosts, and the event sites
// (<tag>.<eventDomain>, exactly one label). The API host and deeper subdomains are not destinations.
function isPlatformHost(host: string): boolean {
  const h = host.toLowerCase()
  const { main, id, admin, exercises, api, eventDomain } = hosts()
  if ([main, id, admin, exercises].includes(h)) return true
  if (h === api || !eventDomain || !h.endsWith("." + eventDomain.toLowerCase())) return false
  const label = h.slice(0, -eventDomain.length - 1)
  return label !== "" && !label.includes(".")
}

// The portless https form of a return_to on our sites, or null (other host, not https, credentials, unparseable).
function platformTarget(value: string): string | null {
  try {
    const u = new URL(value)
    if (u.protocol !== "https:" || u.username || u.password || !isPlatformHost(u.hostname)) return null
    // The platform is always reached on its fixed external port: never keep one (e.g. a dev :3001).
    return `https://${u.hostname}${u.pathname}${u.search}${u.hash}`
  } catch {
    return null
  }
}

/**
 * safeReturnTo — open-redirect guard. Accepts a return_to only on our sites
 * (landing, id, admin, exercises, event sites; see isPlatformHost), https, without
 * credentials; everything else (the API host, other hosts, relative, unparseable)
 * falls back to /profile.
 */
export function safeReturnTo(returnTo?: string, fallback = "/profile/"): string {
  return (returnTo && platformTarget(returnTo)) || fallback
}

/**
 * rememberReturnTo — persists the cib_return_to cookie on auth-page mount.
 *
 * Writes `document.cookie = cib_return_to=<portless-https-url>; ...` ONLY when
 * `returnTo` is a genuine absolute https URL within the platform domain (same
 * trust logic as `safeReturnTo`). Relative paths and off-platform URLs are
 * silently ignored — the backend's ConsumeReturnTo trusts only absolute
 * same-platform https URLs with no port.
 *
 * NOTE: Minor duplication of `writeReturnToCookie` in src/api/client.ts is
 * intentional — client.ts cannot import auth.ts (circular dep risk) and the
 * two call sites have different inputs (current-href vs caller-supplied URL).
 *
 * SSR/static-export safe: no-ops when `typeof window === "undefined"`.
 */
export function rememberReturnTo(returnTo?: string): void {
  if (typeof window === "undefined" || !returnTo) return
  const target = platformTarget(returnTo)
  if (target) document.cookie = `${COOKIE_RETURN_TO}=${encodeURIComponent(target)}; path=/; SameSite=Lax; Secure`
}

/**
 * On a guest-only page (sign-in/up, password reset), bounce an already-authed
 * user away. id reads the master cookie directly, so fetchMe is authoritative.
 * Returns true while a redirect is in flight (render nothing/loader).
 */
export async function redirectIfAuthed(returnTo?: string): Promise<boolean> {
  const me = await fetchMe()
  if (!me) return false
  const dest = safeReturnTo(returnTo)
  window.location.href = dest
  return true
}
