// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fit = vi.hoisted(() => vi.fn())
vi.mock("@/lib/fitImage", async (orig) => ({ ...(await orig<typeof import("@/lib/fitImage")>()), fitImage: fit }))
vi.mock("./AvatarCropDialog", () => ({
  AvatarCropDialog: ({ imageSrc, onConfirm }: { imageSrc: string | null; onConfirm: (blob: Blob) => void }) =>
    imageSrc ? <button type="button" data-testid="crop-confirm" onClick={() => onConfirm(new Blob(["x"]))}>ok</button> : null,
}))

import { ProfileTab } from "./ProfileTab"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// A controllable XMLHttpRequest: the test drives upload progress and the answer.
class FakeXhr {
  static last: FakeXhr | null = null
  method = ""
  url = ""
  status = 0
  responseText = ""
  withCredentials = false
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor() { FakeXhr.last = this }
  open(method: string, url: string) { this.method = method; this.url = url }
  setRequestHeader() {}
  getAllResponseHeaders() { return "content-type: application/json\r\n" }
  send() {}
  progress(loaded: number, total: number) { this.upload.onprogress?.({ lengthComputable: true, loaded, total }) }
  answer(status: number, body: unknown) { this.status = status; this.responseText = JSON.stringify(body); this.onload?.() }
}

const account = { ID: "u1", FirstName: "A", LastName: "B", Email: "a@b.c", Picture: "", EmailConfirmed: true, Role: "user", Providers: [], HasPassword: true, CreatedAt: "" }

describe("ProfileTab photo", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    URL.createObjectURL = vi.fn(() => "blob:crop")
    URL.revokeObjectURL = vi.fn()
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    fit.mockReset()
  })

  async function pick(file: File) {
    await act(async () => { root.render(<ProfileTab account={account} onUpdated={() => {}} />) })
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, "files", { value: [file], configurable: true })
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })) })
  }

  it("shrinks the picked picture before the crop editor opens", async () => {
    const picked = new File(["big"], "wide.webp", { type: "image/webp" })
    const fitted = new File(["small"], "wide.webp", { type: "image/webp" })
    fit.mockResolvedValue(fitted)
    await pick(picked)
    expect(fit).toHaveBeenCalledWith(picked)
    expect(URL.createObjectURL).toHaveBeenCalledWith(fitted)
    expect(host.querySelector('[data-testid="crop-confirm"]')).not.toBeNull()
  })

  it("shows only the upload error after a failed upload", async () => {
    fit.mockImplementation(async (file: File) => file)
    vi.stubGlobal("XMLHttpRequest", FakeXhr)
    await pick(new File(["x"], "a.png", { type: "image/png" }))
    await act(async () => { host.querySelector<HTMLButtonElement>('[data-testid="crop-confirm"]')!.click() })
    await act(async () => { FakeXhr.last!.answer(400, { Status: { Code: 1004 } }) })
    expect(host.querySelectorAll("#profile-photo-error")).toHaveLength(1)
    expect(host.querySelectorAll('[role="alert"]').length).toBe(1)
  })

  it("the busy photo button shows the upload progress", async () => {
    fit.mockImplementation(async (file: File) => file)
    vi.stubGlobal("XMLHttpRequest", FakeXhr)
    const updated = vi.fn()
    await act(async () => { root.render(<ProfileTab account={account} onUpdated={updated} />) })
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, "files", { value: [new File(["x"], "a.png", { type: "image/png" })], configurable: true })
    await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })) })
    await act(async () => { host.querySelector<HTMLButtonElement>('[data-testid="crop-confirm"]')!.click() })
    const xhr = FakeXhr.last!
    expect(xhr.method).toBe("POST")
    expect(xhr.withCredentials).toBe(true)
    const busyFace = () => host.querySelector('[aria-busy="true"] .ib-btn__face--busy:not([aria-hidden])')?.textContent
    expect(busyFace()).toBe("Завантажуємо…")
    await act(async () => { xhr.progress(42, 100) })
    expect(busyFace()).toBe("Завантажуємо 42%")
    await act(async () => { xhr.answer(200, { Status: { Code: 0 } }) })
    expect(host.querySelector('[aria-busy="true"]')).toBeNull()
    expect(updated).toHaveBeenCalled()
  })
})

describe("ProfileTab photo removal", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  const button = (text: string) => Array.from(document.querySelectorAll("button")).find((b) => b.textContent === text)

  it("asks before removing the photo and removes it only after the confirmation", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ Status: { Code: 0 } }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    await act(async () => { root.render(<ProfileTab account={{ ...account, Picture: "/media/a.jpg" }} onUpdated={() => {}} />) })
    await act(async () => { button("Видалити фото")!.click() })
    expect(fetchMock).not.toHaveBeenCalled()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain("Видалити фото профілю?")
    const confirm = dialog!.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(confirm.querySelector(".ib-btn__face:not([aria-hidden])")?.textContent).toBe("Видалити")
    await act(async () => { confirm.click() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe("DELETE")
  })
})
