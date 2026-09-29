/**
 * src/lib/serviceStatus.ts — app-wide "is the API reachable" state.
 *
 * COPY-TO-RP-APPS: framework-free, static-export-safe.
 *
 * The api client reports every request: a network failure or a 5xx response
 * starts a short confirmation period (aborts, timeouts and 4xx never count).
 * <ServiceStatusGate/> (root layout) probes /api/auth/me before showing the
 * modal; when session validation works again it announces "restored" so
 * screens whose data failed to load can refetch (onServiceRestored).
 */

export type ServiceStatus = "up" | "suspect" | "down"
type Listener = (status: ServiceStatus) => void

let status: ServiceStatus = "up"
const listeners = new Set<Listener>()
const restoredListeners = new Set<() => void>()

export function isServiceDown(): boolean {
  return status !== "up"
}

export function getServiceStatus(): ServiceStatus {
  return status
}

export function reportServiceUnavailable(): void {
  if (status !== "up") return
  status = "suspect"
  listeners.forEach((l) => l(status))
}

export function confirmServiceUnavailable(): void {
  if (status !== "suspect") return
  status = "down"
  listeners.forEach((l) => l(status))
}

export function reportServiceAvailable(): void {
  if (status === "up") return
  status = "up"
  listeners.forEach((l) => l(status))
  restoredListeners.forEach((l) => l())
}

export function subscribeServiceStatus(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Run `fn` each time the API comes back after an outage. Returns an unsubscribe. */
export function onServiceRestored(fn: () => void): () => void {
  restoredListeners.add(fn)
  return () => restoredListeners.delete(fn)
}

/** True for server failures that should keep the user on the current frontend. */
export function isUnavailableStatus(status: number): boolean {
  return status >= 500 && status <= 599
}

// Requests cut by leaving the page fail like a network error; they are not outages.
let leaving = false
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { leaving = true })
  window.addEventListener("pageshow", () => { leaving = false })
}

/**
 * A failed request that may mean the API is unreachable: not one the caller
 * aborted or timed out, and not one cut by the page unloading. Only rejected
 * requests reach here; a 4xx answer never counts.
 */
export function isNetworkOutage(error: unknown, signal?: AbortSignal | null): boolean {
  if (leaving || signal?.aborted) return false
  return !(error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError"))
}

// Long enough for a slow answer over a busy connection; a hung API still fails.
const PROBE_TIMEOUT_MS = 10_000

/**
 * The recovery probe: session validation answers below 500 for everyone (200
 * signed in, 401 anonymous) once the API and its storage respond. It goes to
 * the API origin like every other call.
 */
export async function probeService(origin: string): Promise<boolean> {
  if (!origin) return false
  try {
    const response = await fetch(`${origin}/api/auth/me`, {
      credentials: "include", cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return !isUnavailableStatus(response.status)
  } catch {
    return false
  }
}
