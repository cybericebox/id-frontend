// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { forgetHeldBanners, SiteBanners } from "./SiteBanners"

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock("@/api/client", () => ({ apiGet: api.get, apiPatch: api.patch }))

// The pulse answers with a version; the banner list is fetched from its own URL.
let version = "v1"
let list: unknown[] | Error[] = []
function serve(...lists: unknown[]) {
  list = lists
  api.get.mockImplementation(async (path: string) => {
    if (path.startsWith("/api/notifications/pulse")) return { Banners: version, Inbox: null }
    const next = list.length > 1 ? list.shift() : list[0]
    if (next instanceof Error) throw next
    return next
  })
}

const banner = (ID: string, Text: string, Version = 1, Kind = "site") => ({ ID, Kind, Text, Version, Dismissible: true, Level: "info" })
let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  api.get.mockReset()
  api.patch.mockReset()
  api.patch.mockResolvedValue(undefined)
  version = "v1"
  forgetHeldBanners()
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] })
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  vi.stubGlobal("matchMedia", () => ({ matches: true }))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("live site announcements", () => {
  it("requests the ID site and retains the other announcement after dismissing one", async () => {
    serve([banner("b1", "First"), banner("b2", "Second")])
    await act(async () => root.render(<SiteBanners />))
    expect(api.get).toHaveBeenCalledWith("/api/notifications/banners?site=id", undefined, { required: false })
    expect(container.querySelectorAll(".ib-site-banner__text")).toHaveLength(1)
    expect(container.textContent).toContain("Ще 1 оголошення")
    await act(async () => container.querySelector<HTMLButtonElement>(".ib-site-banner__x")!.click())
    expect(container.textContent).not.toContain("First")
    expect(container.textContent).toContain("Second")
    expect(container.querySelector(".ib-site-banner__more")).toBeNull()
    expect(localStorage.getItem("cib_site_banner_dismissed_b1_1")).toBe("1")
  })

  it("reveals nine other announcements in server order and dismisses them individually", async () => {
    serve(Array.from({ length: 10 }, (_, index) => banner(`b${index}`, `Announcement ${index}`)))
    await act(async () => root.render(<SiteBanners />))
    expect(container.querySelectorAll(".ib-site-banner__text")).toHaveLength(1)
    expect(container.textContent).toContain("Ще 9 оголошень")
    await act(async () => container.querySelector<HTMLButtonElement>(".ib-site-banner__more")!.click())
    const panel = document.querySelector('[role="dialog"]')!
    expect(document.activeElement).toBe(panel.querySelector("h2"))
    expect([...panel.querySelectorAll(".ib-site-banner__text")].map((node) => node.textContent)).toEqual(Array.from({ length: 9 }, (_, index) => `Announcement ${index + 1}`))
    await act(async () => panel.querySelector<HTMLButtonElement>(".ib-site-banner__x")!.click())
    expect(panel.textContent).not.toContain("Announcement 1")
    expect(container.textContent).toContain("Ще 8 оголошень")
    await act(async () => container.querySelector<HTMLButtonElement>(".ib-site-banner__x")!.click())
    expect(container.textContent).toContain("Announcement 2")
    expect(container.textContent).not.toContain("Announcement 0")
    expect(container.textContent).toContain("Ще 7 оголошень")
    await act(async () => panel.querySelector("h2")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })))
    await vi.waitFor(() => expect(document.activeElement).toBe(container.querySelector(".ib-site-banner__more")))
  })

  it("refetches the list only when the pulse reports a new version, and keeps content during an outage", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    serve([banner("b1", "Before")], new Error("down"), [banner("b1", "After", 2)])
    await act(async () => root.render(<SiteBanners />))
    const lists = () => api.get.mock.calls.filter(([path]) => String(path).startsWith("/api/notifications/banners")).length
    expect(lists()).toBe(1)
    expect(container.textContent).toContain("Before")
    // same version: no new list
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(lists()).toBe(1)
    // new version, the list request fails: content stays, the next pulse retries
    version = "v2"
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(lists()).toBe(2)
    expect(container.textContent).toContain("Before")
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(lists()).toBe(3)
    expect(container.textContent).toContain("After")
    expect(container.textContent).not.toContain("Before")
  })

  it("fetches the list only after the first pulse answered, never independently on load", async () => {
    let answerPulse: (value: unknown) => void = () => {}
    api.get.mockImplementation((path: string) => path.startsWith("/api/notifications/pulse")
      ? new Promise((resolve) => { answerPulse = resolve })
      : Promise.resolve([banner("b1", "Listed")]))
    await act(async () => root.render(<SiteBanners />))
    expect(api.get.mock.calls.map(([path]) => String(path))).toEqual(["/api/notifications/pulse?site=id"])
    await act(async () => answerPulse({ Banners: "v7", Inbox: null }))
    expect(api.get.mock.calls.map(([path]) => String(path))).toEqual(["/api/notifications/pulse?site=id", "/api/notifications/banners?site=id"])
    expect(container.textContent).toContain("Listed")
  })

  it("never asks for the list while the pulse reports no banners, and clears it without a request", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    version = "e3b0c44298fc1c14"
    serve([banner("b1", "Listed")])
    await act(async () => root.render(<SiteBanners />))
    const lists = () => api.get.mock.calls.filter(([path]) => String(path).startsWith("/api/notifications/banners")).length
    expect(lists()).toBe(0)
    version = ""
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(lists()).toBe(0)
    version = "v2"
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(lists()).toBe(1)
    expect(container.textContent).toContain("Listed")
    version = "e3b0c44298fc1c14"
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(lists()).toBe(1)
    expect(container.textContent).not.toContain("Listed")
  })

  it("a remount with the version already held shows the list without a request", async () => {
    serve([banner("b1", "Listed")])
    await act(async () => root.render(<SiteBanners />))
    await act(async () => root.render(<></>))
    await act(async () => root.render(<SiteBanners />))
    expect(container.textContent).toContain("Listed")
    expect(api.get.mock.calls.filter(([path]) => String(path).startsWith("/api/notifications/banners"))).toHaveLength(1)
  })

  it("dismisses a personal banner on the server and a site banner locally", async () => {
    serve([banner("p1", "Personal", 1, "personal")])
    await act(async () => root.render(<SiteBanners />))
    await act(async () => container.querySelector<HTMLButtonElement>(".ib-site-banner__x")!.click())
    expect(api.patch).toHaveBeenCalledWith("/api/notifications/banners/p1/dismiss", {}, undefined, { required: false })
    expect(container.textContent).not.toContain("Personal")
    expect(localStorage.getItem("cib_site_banner_dismissed_p1_1")).toBeNull()
  })
})
