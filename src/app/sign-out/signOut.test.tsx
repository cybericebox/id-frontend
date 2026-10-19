// @vitest-environment jsdom
// Sign-out happens only on the owner's click (a link from another site cannot log anyone out), and a failed request
// never looks like a done sign-out.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("return_to=https%3A%2F%2Fadmin.cybericebox.local%2F") }))

import SignOutPage from "./page"
import { profileNameDraftKey } from "@/lib/storageKeys"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("/sign-out", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  const fetchMock = vi.fn()
  const location = { href: "https://id.cybericebox.local/sign-out/" }
  beforeEach(() => {
    fetchMock.mockReset()
    location.href = "https://id.cybericebox.local/sign-out/"
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("location", location)
    sessionStorage.clear()
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  const render = async () => { await act(async () => { root.render(<SignOutPage />) }) }
  const signOutButton = () => host.querySelector<HTMLButtonElement>("button[data-sign-out]")!

  it("sends nothing on load: the page asks first", async () => {
    await render()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(signOutButton().querySelector(".ib-btn__face:not([aria-hidden])")?.textContent).toBe("Вийти")
    expect(location.href).toBe("https://id.cybericebox.local/sign-out/")
  })

  it("signs out with a POST on the click, clears the drafts and goes to return_to", async () => {
    sessionStorage.setItem(profileNameDraftKey("u1"), "{}")
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await render()
    await act(async () => { signOutButton().click() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/auth\/sign-out$/)
    expect(init.method).toBe("POST")
    expect(init.credentials).toBe("include")
    expect(sessionStorage.length).toBe(0)
    expect(location.href).toBe("https://admin.cybericebox.local/")
  })

  it("an already ended session (401) counts as signed out", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    await render()
    await act(async () => { signOutButton().click() })
    expect(location.href).toBe("https://admin.cybericebox.local/")
  })

  it.each([
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a 5xx", () => Promise.resolve(new Response(null, { status: 503 }))],
  ])("%s shows the error with a retry and stays signed in", async (_name, answer) => {
    fetchMock.mockImplementation(answer)
    await render()
    await act(async () => { signOutButton().click() })
    expect(location.href).toBe("https://id.cybericebox.local/sign-out/")
    const error = host.querySelector("[data-load-error]")
    expect(error?.textContent).toContain("Не вдалося вийти")
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const retry = Array.from(error!.querySelectorAll("button")).find((b) => b.textContent === "Спробувати ще раз")!
    await act(async () => { retry.click() })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(location.href).toBe("https://admin.cybericebox.local/")
  })
})
