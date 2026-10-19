// @vitest-environment jsdom
// A one-time token leaves the address bar as soon as the page has read it (history, screenshots, analytics never see
// it); the tab keeps it, so a reload still works.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const replace = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({ usePathname: () => "/reset-password/", useRouter: () => ({ replace }) }))

import { useUrlToken } from "./useUrlToken"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let seen: string | null | undefined
function Probe({ query }: { query: string | null }) {
  seen = useUrlToken(query === null ? null : new URLSearchParams(query))
  return null
}

describe("useUrlToken", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    sessionStorage.clear()
    replace.mockReset()
    seen = undefined
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it("is null until the URL is known", async () => {
    await act(async () => { root.render(<Probe query={null} />) })
    expect(seen).toBeNull()
  })

  it("reads the token, then removes it (and the old ?code=) from the address, keeping return_to", async () => {
    await act(async () => { root.render(<Probe query="token=SECRET&return_to=https%3A%2F%2Fadmin.x%2F" />) })
    expect(seen).toBe("SECRET")
    expect(replace).toHaveBeenCalledWith("/reset-password/?return_to=https%3A%2F%2Fadmin.x%2F", { scroll: false })
    // the address no longer has it: the tab still knows the token (a reload works)
    await act(async () => { root.render(<Probe query="return_to=https%3A%2F%2Fadmin.x%2F" />) })
    expect(seen).toBe("SECRET")
  })

  it("accepts the legacy ?code= and leaves a token-free address alone", async () => {
    await act(async () => { root.render(<Probe query="code=OLD" />) })
    expect(seen).toBe("OLD")
    expect(replace).toHaveBeenCalledWith("/reset-password/", { scroll: false })
    replace.mockReset()
    sessionStorage.clear()
    act(() => root.unmount())
    root = createRoot(host)
    await act(async () => { root.render(<Probe query="" />) })
    expect(seen).toBe("")
    expect(replace).not.toHaveBeenCalled()
  })
})
