import type { SessionInfo } from "./types"

export type SessionsApi = {
  list: () => Promise<SessionInfo[]>
  revokeOne: (id: string) => Promise<unknown>
  revokeAll: () => Promise<unknown>
}

export type SessionsState = {
  sessions: SessionInfo[]
  // true only until the first successful load; background refreshes never set it.
  loading: boolean
  loadError: unknown
}

// Sessions list with optimistic revoke. Requests go through one promise chain, so quick
// clicks never race, and a pending request never disables any control.
export function createSessionsStore(api: SessionsApi, onChange: (state: SessionsState) => void) {
  let state: SessionsState = { sessions: [], loading: true, loadError: null }
  let loaded = false
  let chain: Promise<unknown> = Promise.resolve()

  const set = (patch: Partial<SessionsState>) => {
    state = { ...state, ...patch }
    onChange(state)
  }
  const enqueue = <T,>(job: () => Promise<T>): Promise<T> => {
    const run = chain.then(job)
    chain = run.catch(() => undefined)
    return run
  }

  async function load() {
    if (!loaded) set({ loading: true, loadError: null })
    try {
      const data = await api.list()
      loaded = true
      set({ sessions: data ?? [], loading: false, loadError: null })
    } catch (err) {
      // A failed background refresh keeps the list on screen.
      if (!loaded) set({ loading: false, loadError: err })
    }
  }

  // Removes the row right away; on failure puts it back and rethrows.
  async function revokeOne(id: string) {
    const before = state.sessions
    set({ sessions: before.filter((s) => s.ID !== id) })
    try {
      await enqueue(() => api.revokeOne(id))
    } catch (err) {
      const restored = new Set(state.sessions.map((s) => s.ID))
      set({ sessions: before.filter((s) => restored.has(s.ID) || s.ID === id) })
      throw err
    }
  }

  // The confirm dialog owns the busy state; the list only changes once the server agrees.
  async function revokeAll() {
    await enqueue(() => api.revokeAll())
    set({ sessions: state.sessions.filter((s) => s.IsCurrent) })
  }

  return { load, revokeOne, revokeAll, get: () => state }
}
