/**
 * src/lib/serviceStatus.ts — app-wide "is the API reachable" state.
 *
 * COPY-TO-RP-APPS: framework-free, static-export-safe.
 *
 * The api client reports every request: a network failure or a 502/503/504
 * marks the service unavailable, any response from the backend marks it
 * available again. <ServiceStatusGate/> (root layout) renders the overlay and
 * polls /api/health; when the backend is back it announces "restored" so
 * screens whose data failed to load can refetch (onServiceRestored).
 */

type Listener = (unavailable: boolean) => void

let unavailable = false
const listeners = new Set<Listener>()
const restoredListeners = new Set<() => void>()

export function isServiceDown(): boolean {
  return unavailable
}

export function reportServiceUnavailable(): void {
  if (unavailable) return
  unavailable = true
  listeners.forEach((l) => l(true))
}

export function reportServiceAvailable(): void {
  if (!unavailable) return
  unavailable = false
  listeners.forEach((l) => l(false))
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

/** True for failures that mean "backend unreachable", not an API error. */
export function isUnavailableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}
