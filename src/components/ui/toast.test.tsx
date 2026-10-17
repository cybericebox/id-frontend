// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ToastProvider, toast } from "./toast"
import { toastApiError } from "./toastApiError"
import { ApiError } from "@/api/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("toast retry action", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  const button = (label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent === label)
  const show = async (fn: () => void) => { await act(async () => { fn() }) }
  beforeEach(async () => {
    host = document.createElement("div")
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root.render(<ToastProvider><span /></ToastProvider>))
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  it("offers «Спробувати ще раз» on an overload error and runs the retry once, closing the toast", async () => {
    const retry = vi.fn()
    await show(() => toastApiError(new ApiError(503, null, "x", undefined, undefined, 1), retry))
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Сервер перевантажений, спробуйте за кілька секунд")
    await act(async () => button("Спробувати ще раз")!.click())
    expect(retry).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  it("shows no retry button for a 500, a 503 without Retry-After, or without a handler", async () => {
    await show(() => {
      toastApiError(new ApiError(500, null), vi.fn())
      toastApiError(new ApiError(503, null), vi.fn())
      toastApiError(new ApiError(503, null, "x", undefined, undefined, 1))
      toast.error("plain")
    })
    expect(host.querySelectorAll('[role="alert"]')).toHaveLength(4)
    expect(button("Спробувати ще раз")).toBeUndefined()
  })
})
