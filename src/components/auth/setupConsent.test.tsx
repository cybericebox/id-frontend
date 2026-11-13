// @vitest-environment jsdom
// The consent on «Продовження реєстрації»: the checkbox, the validation and the request follow the documents the page shows (the Terms and the
// Privacy Policy, from the settings written into <html>). The request carries exactly the shown documents, never one that was not shown.
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/setup/", useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock("@/lib/useGuestOnly", () => ({ useGuestOnly: () => {} }))

import { SetupScreen } from "./SetupScreen"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const COMBINATIONS = [
  { name: "both", terms: "https://example.org/terms", privacy: "https://example.org/privacy", documents: ["terms", "privacy"] },
  { name: "only the Terms", terms: "https://example.org/terms", privacy: "", documents: ["terms"] },
  { name: "only the Privacy Policy", terms: "", privacy: "https://example.org/privacy", documents: ["privacy"] },
  { name: "neither", terms: "", privacy: "", documents: [] },
] as const

describe("setup consent", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  let posts: { body: Record<string, unknown> }[]
  let answer: { status: number; code: number }

  beforeEach(() => {
    sessionStorage.clear()
    posts = []
    answer = { status: 400, code: 20407 }
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    for (const attr of ["data-cfg-terms-url", "data-cfg-privacy-url"]) document.documentElement.removeAttribute(attr)
  })

  const render = async (terms: string, privacy: string) => {
    document.documentElement.setAttribute("data-cfg-terms-url", terms)
    document.documentElement.setAttribute("data-cfg-privacy-url", privacy)
    window.history.replaceState(null, "", "/setup/?token=tok")
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
      if (url.includes("/api/auth/setup") && init?.method === "POST") {
        posts.push({ body: JSON.parse(String(init.body)) })
        return json({ Status: { Code: answer.code, Message: "m" } }, answer.status)
      }
      return json({ Status: { Code: 0 }, Data: url.includes("/api/auth/setup") ? { Email: "olena@example.com", FirstName: "Олена", LastName: "Коваль", HasProvider: true } : null })
    }))
    await act(async () => { root.render(<SetupScreen />) })
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  }
  const checkbox = () => host.querySelector<HTMLInputElement>('input[name="AcceptTos"]')!
  const submit = async () => {
    await act(async () => { host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click() })
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  }

  it.each(COMBINATIONS)("sends exactly the shown documents when $name is set", async ({ terms, privacy, documents }) => {
    await render(terms, privacy)
    if (documents.length > 0) await act(async () => { checkbox().click() })
    await submit()
    expect(posts).toHaveLength(1)
    expect(posts[0].body.AcceptedDocuments).toEqual(documents)
    expect(posts[0].body).not.toHaveProperty("TosVersion")
    expect(posts[0].body).toMatchObject({ Token: "tok", FirstName: "Олена", LastName: "Коваль" })
  })

  it.each(COMBINATIONS.filter((c) => c.documents.length > 0))("asks for the checkbox at the field and sends nothing when $name is set", async ({ terms, privacy, documents }) => {
    await render(terms, privacy)
    await submit()
    expect(posts).toHaveLength(0)
    const input = checkbox()
    expect(input.getAttribute("aria-invalid")).toBe("true")
    const describedBy = input.getAttribute("aria-describedby") ?? ""
    expect(describedBy.split(" ").some((id) => document.getElementById(id)?.textContent)).toBe(true)
    // the wording follows what is shown
    const text = host.textContent ?? ""
    expect(text).toContain(documents.length === 1 && documents[0] === "privacy" ? "Політикою конфіденційності" : "Умови використання")
  })

  it("asks for nothing when neither document is set", async () => {
    await render("", "")
    await submit()
    expect(posts).toHaveLength(1)
    expect(checkbox().getAttribute("aria-invalid")).not.toBe("true")
  })

  it("names the documents in the labels: links to the Terms and to the Privacy Policy", async () => {
    vi.stubEnv("NEXT_PUBLIC_TERMS_URL", "https://example.org/terms")
    vi.stubEnv("NEXT_PUBLIC_PRIVACY_URL", "https://example.org/privacy")
    await render("https://example.org/terms", "https://example.org/privacy")
    const hrefs = Array.from(host.querySelectorAll<HTMLAnchorElement>("label a")).map((a) => a.getAttribute("href"))
    expect(hrefs).toEqual(expect.arrayContaining(["https://example.org/terms", "https://example.org/privacy"]))
    expect(host.querySelectorAll(".cfg-v-both, .cfg-v-terms, .cfg-v-policy")).toHaveLength(3)
  })

  it("shows a refused set of documents (20407) as a form error, not at the checkbox", async () => {
    await render("https://example.org/terms", "https://example.org/privacy")
    await act(async () => { checkbox().click() })
    await submit()
    const alert = Array.from(host.querySelectorAll('[role="alert"]')).map((a) => a.textContent).join(" ")
    expect(alert).toContain("Потрібно прийняти обовʼязкові документи")
    expect(checkbox().getAttribute("aria-invalid")).not.toBe("true")
  })
})
