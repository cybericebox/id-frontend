import { describe, expect, it } from "vitest"
import { createSessionsStore } from "./sessionsStore"
import type { SessionInfo } from "./types"

const s = (ID: string, IsCurrent = false) => ({ ID, IsCurrent, UserAgent: "", IP: "", LastSeen: "", CreatedAt: "" }) as unknown as SessionInfo
const deferred = () => {
  let resolve!: (v?: unknown) => void
  let reject!: (e: unknown) => void
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function setup(revoke: (id: string) => Promise<unknown>) {
  const store = createSessionsStore(
    { list: async () => [s("a", true), s("b"), s("c")], revokeOne: revoke, revokeAll: async () => undefined },
    () => {},
  )
  return store
}

describe("sessions store", () => {
  it("removes the row before the server answers and keeps the other rows", async () => {
    const d = deferred()
    const store = setup(() => d.promise)
    await store.load()
    const pending = store.revokeOne("b")
    expect(store.get().sessions.map((x) => x.ID)).toEqual(["a", "c"])
    expect(store.get().loading).toBe(false)
    d.resolve()
    await pending
    expect(store.get().sessions.map((x) => x.ID)).toEqual(["a", "c"])
  })

  it("second revoke works while the first is pending, requests are queued in order", async () => {
    const calls: string[] = []
    const ds = { b: deferred(), c: deferred() }
    const store = setup((id) => { calls.push(id); return ds[id as "b" | "c"].promise })
    await store.load()
    const p1 = store.revokeOne("b")
    const p2 = store.revokeOne("c")
    expect(store.get().sessions.map((x) => x.ID)).toEqual(["a"])
    await Promise.resolve()
    expect(calls).toEqual(["b"])
    ds.b.resolve()
    await p1
    await Promise.resolve()
    expect(calls).toEqual(["b", "c"])
    ds.c.resolve()
    await p2
  })

  it("rolls the row back on error", async () => {
    const store = setup(() => Promise.reject(new Error("x")))
    await store.load()
    await expect(store.revokeOne("b")).rejects.toThrow()
    expect(store.get().sessions.map((x) => x.ID)).toEqual(["a", "b", "c"])
  })

  it("a background reload never shows the loader again", async () => {
    const seen: boolean[] = []
    const store = createSessionsStore(
      { list: async () => [s("a", true)], revokeOne: async () => undefined, revokeAll: async () => undefined },
      (st) => seen.push(st.loading),
    )
    await store.load()
    seen.length = 0
    await store.load()
    expect(seen.every((v) => v === false)).toBe(true)
  })
})
