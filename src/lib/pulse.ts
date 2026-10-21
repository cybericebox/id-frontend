// The pulse (backend: GET /api/notifications/pulse): one cheap call per tab that tells the banner bar and
// the inbox button whether anything changed. One loop per tab and scope is shared by every subscriber.
//   - every 30 s ± 20 % jitter while the tab is visible; nothing is scheduled while it is hidden;
//   - one immediate pulse on visible / focus / online / service restored, at most once per 5 s;
//   - guests are pulsed too (Inbox is null for them).
// No cache:"no-store": the answer carries an ETag and the browser revalidates it with a 304.
import { apiGet } from "@/api/client"
import { onServiceRestored } from "@/lib/serviceStatus"

export const PULSE_SITE = "id"
export const PULSE_INTERVAL_MS = 30_000
export const PULSE_JITTER = 0.2
export const PULSE_MIN_GAP_MS = 5_000

export type PulseInbox = { Cursor: string; Unread: number }
export type Pulse = { Banners: string; Inbox: PulseInbox | null }
export type PulseScope = { site: string; event?: string }

/** Query string of the notification endpoints for a scope (site, and event on an event site). */
export function scopeQuery(scope: PulseScope, extra: Record<string, string> = {}): string {
  const query = new URLSearchParams({ site: scope.site })
  if (scope.event) query.set("event", scope.event)
  for (const [key, value] of Object.entries(extra)) query.set(key, value)
  return `?${query.toString()}`
}

/** Delay to the next pulse: the interval ± jitter. `random` is in [0, 1). */
export function pulseDelay(random: number = Math.random()): number {
  return Math.round(PULSE_INTERVAL_MS * (1 - PULSE_JITTER + 2 * PULSE_JITTER * random))
}

/** Tolerant parse: anything that is not a pulse yields null. */
export function parsePulse(data: unknown): Pulse | null {
  if (!data || typeof data !== "object") return null
  const raw = data as { Banners?: unknown; Inbox?: unknown }
  if (typeof raw.Banners !== "string") return null
  let inbox: PulseInbox | null = null
  if (raw.Inbox && typeof raw.Inbox === "object") {
    const value = raw.Inbox as { Cursor?: unknown; Unread?: unknown }
    inbox = { Cursor: typeof value.Cursor === "string" ? value.Cursor : "", Unread: typeof value.Unread === "number" ? value.Unread : 0 }
  }
  return { Banners: raw.Banners, Inbox: inbox }
}

type Listener = (pulse: Pulse) => void
type Loop = { listeners: Set<Listener>; last: Pulse | null; now: (force: boolean) => void; stop: () => void }

const loops = new Map<string, Loop>()
const loopKey = (scope: PulseScope) => `${scope.site}|${scope.event ?? ""}`

function hidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden"
}

function createLoop(scope: PulseScope): Loop {
  const loop: Loop = { listeners: new Set(), last: null, now: () => {}, stop: () => {} }
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false
  let lastAt = Number.NEGATIVE_INFINITY
  let stopped = false

  const clear = () => { if (timer !== null) { clearTimeout(timer); timer = null } }
  const schedule = () => {
    clear()
    if (stopped || hidden()) return
    timer = setTimeout(() => { timer = null; run(false) }, pulseDelay())
  }
  const run = (force: boolean) => {
    if (stopped || inFlight) return
    if (!force && Date.now() - lastAt < PULSE_MIN_GAP_MS) return
    inFlight = true
    lastAt = Date.now()
    clear()
    apiGet<unknown>(`/api/notifications/pulse${scopeQuery(scope)}`, undefined, { required: false })
      .then((data) => {
        const pulse = parsePulse(data)
        if (!pulse || stopped) return
        loop.last = pulse
        for (const listener of [...loop.listeners]) {
          try { listener(pulse) } catch { /* one listener never breaks the others */ }
        }
      })
      .catch(() => { /* a pulse outage never blocks the page; the next one retries */ })
      .finally(() => { inFlight = false; schedule() })
  }
  // visible / focus / online: one immediate pulse (throttled); hidden: stop the timer.
  const wake = () => {
    if (hidden()) { clear(); return }
    run(false)
    if (!inFlight && timer === null) schedule()
  }

  loop.now = run
  document.addEventListener("visibilitychange", wake)
  window.addEventListener("focus", wake)
  window.addEventListener("online", wake)
  const unsubscribe = onServiceRestored(wake)
  loop.stop = () => {
    stopped = true
    clear()
    document.removeEventListener("visibilitychange", wake)
    window.removeEventListener("focus", wake)
    window.removeEventListener("online", wake)
    unsubscribe()
  }
  run(true)
  return loop
}

/** Subscribe to the tab's pulse of a scope. A late subscriber gets the latest pulse right away. Returns the unsubscribe. */
export function subscribePulse(scope: PulseScope, listener: Listener): () => void {
  const key = loopKey(scope)
  let loop = loops.get(key)
  if (!loop) { loop = createLoop(scope); loops.set(key, loop) }
  const current = loop
  current.listeners.add(listener)
  const replay = current.last
  if (replay) queueMicrotask(() => { if (current.listeners.has(listener)) listener(replay) })
  return () => {
    current.listeners.delete(listener)
    if (current.listeners.size === 0 && loops.get(key) === current) { current.stop(); loops.delete(key) }
  }
}

/** An immediate pulse outside the throttle (after the user's own action). */
export function pulseNow(scope: PulseScope): void {
  loops.get(loopKey(scope))?.now(true)
}
