// Minimal fetch-based API client.
// Base URL is same-origin by default; the daemon proxies /api/* paths.
// Override via NEXT_PUBLIC_API_BASE_URL env var for local development.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
    // Sign-in URL advertised by the backend via the X-Sign-In-URL header on 401,
    // so callers can redirect without computing the address.
    public readonly signInUrl?: string
  ) {
    super(message ?? `API error ${status}`)
    this.name = "ApiError"
  }
}

// ApiOptions controls cross-cutting request behavior.
//   on401: "redirect" (default) — a 401 transparently redirects the browser to
//          the backend-advertised sign-in page (X-Sign-In-URL) with return_to,
//          so callers never repeat 401 handling. The promise never resolves
//          (navigation is underway), so no catch/finally runs.
//   on401: "throw" — opt out (e.g. fetchMe, which treats 401 as "anonymous").
export type ApiOptions = { on401?: "redirect" | "throw" }

// redirectToSignInPage is inlined here (no import of lib/auth) to avoid a
// circular dependency, since lib/auth imports ApiError from this module.
function redirectToSignInPage(signInUrl: string | null): void {
  if (typeof window === "undefined") return
  const base = signInUrl || "/sign-in"
  const url = new URL(base, window.location.origin)
  url.searchParams.set("return_to", window.location.href)
  window.location.href = url.toString()
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  opts: ApiOptions = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  // Centralized auth handling: a 401 redirects to sign-in by default. Returning a
  // never-resolving promise stops the caller's success/catch paths from running
  // while the browser navigates away.
  if (res.status === 401 && (opts.on401 ?? "redirect") === "redirect") {
    redirectToSignInPage(res.headers.get("X-Sign-In-URL"))
    return new Promise<never>(() => {})
  }

  let parsed: unknown
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    parsed = await res.json()
  } else {
    parsed = await res.text()
  }

  // The backend wraps every JSON response in an envelope: { Status: { Code,
  // Message }, Data }. Unwrap it here so callers receive the payload directly.
  const envelope =
    parsed && typeof parsed === "object"
      ? (parsed as { Status?: { Message?: string }; Data?: unknown })
      : undefined

  if (!res.ok) {
    throw new ApiError(
      res.status,
      parsed,
      envelope?.Status?.Message,
      res.headers.get("X-Sign-In-URL") ?? undefined
    )
  }

  // Data is absent for empty 200s (e.g. DELETE) — return undefined in that case.
  return (envelope ? envelope.Data : parsed) as T
}

export function apiGet<T>(path: string, init?: RequestInit, opts?: ApiOptions): Promise<T> {
  return request<T>(path, { ...init, method: "GET" }, opts)
}

export function apiPost<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
  opts?: ApiOptions
): Promise<T> {
  return request<T>(path, { ...init, method: "POST", body: JSON.stringify(body) }, opts)
}

export function apiPut<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
  opts?: ApiOptions
): Promise<T> {
  return request<T>(path, { ...init, method: "PUT", body: JSON.stringify(body) }, opts)
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  init?: RequestInit,
  opts?: ApiOptions
): Promise<T> {
  return request<T>(path, { ...init, method: "PATCH", body: JSON.stringify(body) }, opts)
}

export function apiDelete<T>(path: string, init?: RequestInit, opts?: ApiOptions): Promise<T> {
  return request<T>(path, { ...init, method: "DELETE" }, opts)
}
