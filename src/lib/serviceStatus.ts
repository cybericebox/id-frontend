/**
 * src/lib/serviceStatus.ts — app-wide "is the API reachable" state.
 *
 * COPY-TO-RP-APPS: framework-free, static-export-safe.
 *
 * The api client reports every request: a network failure or a 5xx response
 * starts a short confirmation period. <ServiceStatusGate/> (root layout)
 * probes /api/auth/me before showing the overlay; when session validation
 * works again it announces "restored" so
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
