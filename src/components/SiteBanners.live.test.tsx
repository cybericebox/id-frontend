// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SiteBanners } from "./SiteBanners"

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/api/client", () => ({ apiGet: api.get }))

const banner = (ID: string, Text: string, Version = 1) => ({ ID, Text, Version, Dismissible: true, Level: "info" })
let container: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  localStorage.clear()
  api.get.mockReset()
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  vi.stubGlobal("matchMedia", () => ({ matches: true }))
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe("live site announcements", () => {
  it("requests the ID site and retains the other announcement after dismissing one", async () => {
    api.get.mockResolvedValue([banner("b1", "First"), banner("b2", "Second")])
    await act(async () => root.render(<SiteBanners />))
    expect(api.get).toHaveBeenCalledWith("/api/banners?site=id", undefined, { required: false })
    expect(container.querySelectorAll(".ib-site-banner__text")).toHaveLength(1)
    expect(container.textContent).toContain("Ще 1 оголошення")
    await act(async () => container.querySelector<HTMLButtonElement>(".ib-site-banner__x")!.click())
    expect(container.textContent).not.toContain("First")
    expect(container.textContent).toContain("Second")
    expect(container.querySelector(".ib-site-banner__more")).toBeNull()
    expect(localStorage.getItem("cib_site_banner_dismissed_b1_1")).toBe("1")
  })

  it("reveals nine other announcements in server order and dismisses them individually", async () => {
    api.get.mockResolvedValue(Array.from({ length: 10 }, (_, index) => banner(`b${index}`, `Announcement ${index}`)))
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

  it("keeps visible content during an outage and refreshes on focus and network recovery", async () => {
    api.get.mockResolvedValueOnce([banner("b1", "Before")]).mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([banner("b1", "After", 2)])
    await act(async () => root.render(<SiteBanners />))
    await act(async () => window.dispatchEvent(new Event("focus")))
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain("Before")
    await act(async () => window.dispatchEvent(new Event("online")))
    expect(container.textContent).toContain("After")
    expect(container.textContent).not.toContain("Before")
  })
})
