// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/api/client"
import { ResendMail, retryAfterSeconds } from "./ResendMail"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("retryAfterSeconds", () => {
  it("reads the backend's RetryAfterSeconds, then the Retry-After header", () => {
    expect(retryAfterSeconds(new ApiError(429, { Status: { Code: 1 }, Data: { RetryAfterSeconds: 42 } }))).toBe(42)
    expect(retryAfterSeconds(new ApiError(429, {}, undefined, undefined, undefined, 17))).toBe(17)
    expect(retryAfterSeconds(new ApiError(400, {}))).toBeUndefined()
    expect(retryAfterSeconds(new Error("x"))).toBeUndefined()
  })
})

describe("ResendMail", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    vi.useFakeTimers()
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
  })

  const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>("button"))

  it("counts down 60 s, then resends and starts again; «Змінити адресу» stays available", async () => {
    const resend = vi.fn().mockResolvedValue(undefined)
    const change = vi.fn()
    await act(async () => { root.render(<ResendMail resend={resend} onChangeAddress={change} />) })
    expect(buttons()[0].disabled).toBe(true)
    expect(buttons()[0].textContent).toContain("60")
    await act(async () => { vi.advanceTimersByTime(15_000) })
    expect(buttons()[0].textContent).toContain("45")
    await act(async () => { vi.advanceTimersByTime(45_000) })
    expect(buttons()[0].disabled).toBe(false)
    await act(async () => { buttons()[0].click() })
    expect(resend).toHaveBeenCalledTimes(1)
    expect(buttons()[0].disabled).toBe(true)
    await act(async () => { buttons()[1].click() })
    expect(change).toHaveBeenCalled()
  })

  it("a refusal with RetryAfterSeconds restarts the countdown with that wait", async () => {
    const resend = vi.fn().mockRejectedValue(new ApiError(429, { Data: { RetryAfterSeconds: 25 } }, undefined, undefined, 70428, 25))
    await act(async () => { root.render(<ResendMail resend={resend} onChangeAddress={() => {}} initialSeconds={0} />) })
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(buttons()[0].disabled).toBe(false)
    await act(async () => { buttons()[0].click() })
    expect(buttons()[0].disabled).toBe(true)
    expect(buttons()[0].textContent).toContain("25")
    expect(host.querySelector("[role=alert]")).not.toBeNull()
  })
})
