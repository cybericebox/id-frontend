// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { InboxButton } from "./InboxButton"

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", () => ({ apiGet: api.get, apiPatch: vi.fn(), apiPost: vi.fn() }))

const counts = { All: 3, Requests: 0, Personal: 3, Activity: 0 }
const item = (id: string) => ({ ID: id, Title: id, Body: "", Link: "", ReadAt: null, CreatedAt: "2026-10-21T10:00:00Z", Category: "personal" })
let container: HTMLDivElement
let root: Root
let pulse: { Banners: string; Inbox: { Cursor: string; Unread: number } | null }
const calls = (match: string) => api.get.mock.calls.map(([path]) => String(path)).filter((path) => path.includes(match))

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
  api.get.mockReset()
  pulse = { Banners: "v1", Inbox: { Cursor: "c1", Unread: 1 } }
  api.get.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/notifications/pulse")) return pulse
    const params = new URL(path, "http://x").searchParams
    if (params.has("since")) {
      const since = params.get("since")
      if (since === "") return { Cursor: "c1", Items: [], Unread: 1, Counts: counts, OtherEventsCount: 0 }
      if (since === "c1") return { Cursor: "c2", Items: [item("a")], Unread: 2, Counts: counts, OtherEventsCount: 0 }
      if (since === "c2") return { Cursor: "c3", Items: [item("b")], Unread: 3, Counts: counts, OtherEventsCount: 0 }
    }
    return { Items: [], NextCursor: "" }
  })
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe("inbox follows the pulse", () => {
  it("takes a baseline first, then asks since the held cursor until it reaches the pulse cursor", async () => {
    await act(async () => root.render(<InboxButton />))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(calls("since=")).toEqual(["/api/notifications/inbox?site=id&since="])
    expect(calls("since=")).not.toContain("category")

    pulse = { Banners: "v1", Inbox: { Cursor: "c3", Unread: 3 } }
    await act(async () => { await vi.advanceTimersByTimeAsync(40_000) })
    expect(calls("since=")).toEqual([
      "/api/notifications/inbox?site=id&since=",
      "/api/notifications/inbox?site=id&since=c1",
      "/api/notifications/inbox?site=id&since=c2",
    ])
    expect(container.querySelector("button")!.getAttribute("aria-label")).toContain("3")
  })

  it("does not ask again while neither the cursor nor Unread changed", async () => {
    await act(async () => root.render(<InboxButton />))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    await act(async () => { await vi.advanceTimersByTimeAsync(100_000) })
    expect(calls("since=")).toHaveLength(1)
    expect(calls("/api/notifications/pulse").length).toBeGreaterThan(2)
  })

  const lists = () => api.get.mock.calls.map(([path]) => String(path)).filter((path) => path.startsWith("/api/notifications/inbox") && !path.includes("since="))

  it("never reads the list while the dropdown is closed, even when Unread moves without news", async () => {
    await act(async () => root.render(<InboxButton />))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation((path: string) => path.includes("since=c1") ? Promise.resolve({ Cursor: "c1", Items: [], Unread: 0, Counts: counts, OtherEventsCount: 0 }) : base(path))
    pulse = { Banners: "v1", Inbox: { Cursor: "c1", Unread: 0 } }
    await act(async () => { await vi.advanceTimersByTimeAsync(40_000) })
    expect(calls("since=")).toHaveLength(2)
    expect(lists()).toEqual([])
  })

  it("reads the list behind the crest when the dropdown opens", async () => {
    await act(async () => root.render(<InboxButton />))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    let answer: () => void = () => {}
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation((path: string) => path.startsWith("/api/notifications/inbox?") && !path.includes("since=")
      ? new Promise((resolve) => { answer = () => resolve({ Items: [item("listed")], NextCursor: "" }) })
      : base(path))
    await act(async () => container.querySelector("button")!.click())
    expect(lists()).toHaveLength(1)
    expect(document.body.querySelector("[role=status]")).not.toBeNull()
    await act(async () => { answer() })
    expect(document.body.textContent).toContain("listed")
  })

  it("a read in another tab asks the pulse, not the inbox", async () => {
    await act(async () => root.render(<InboxButton />))
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    const pulses = calls("/api/notifications/pulse").length
    await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: "cib_inbox_read" })) })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(calls("/api/notifications/pulse").length).toBe(pulses + 1)
    expect(calls("since=")).toHaveLength(1)
  })
})
