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

const account = { FirstName: "A", LastName: "B", Email: "a@b.c", Picture: "", EmailConfirmed: true, Role: "user", Providers: [], HasPassword: true, CreatedAt: "" }

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
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ Status: { Code: 1004 } }), { status: 400, headers: { "Content-Type": "application/json" } })))
    await pick(new File(["x"], "a.png", { type: "image/png" }))
    await act(async () => { host.querySelector<HTMLButtonElement>('[data-testid="crop-confirm"]')!.click() })
    expect(host.querySelectorAll("#profile-photo-error")).toHaveLength(1)
    expect(host.querySelectorAll('[role="alert"]').length).toBe(1)
  })
})
