// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { Button } from "./button"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe("busy button", () => {
  let host: HTMLElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    host = document.body.appendChild(document.createElement("div"))
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  const render = (busy: boolean) => act(() => root.render(<Button busy={busy} busyLabel="Зберігаємо…">Зберегти</Button>))
  const visibleFace = (button: HTMLButtonElement) => button.querySelector(".ib-btn__face:not([aria-hidden])")

  it("names the running operation with the crest in place of the label and is disabled", () => {
    render(false)
    const button = host.querySelector("button")!
    expect(button.disabled).toBe(false)
    expect(visibleFace(button)?.textContent).toBe("Зберегти")
    expect(button.querySelector(".crest-loader")).toBeNull()

    render(true)
    expect(host.querySelector("button")).toBe(button)
    expect(button.disabled).toBe(true)
    expect(button.getAttribute("aria-busy")).toBe("true")
    expect(visibleFace(button)?.textContent).toBe("Зберігаємо…")
    expect(visibleFace(button)?.querySelector(".crest-loader")).not.toBeNull()
  })

  it("keeps both faces in the button, so its width never jumps", () => {
    render(false)
    const button = host.querySelector("button")!
    expect(button.querySelectorAll(".ib-btn__face")).toHaveLength(2)
    expect(button.textContent).toContain("Зберігаємо…")
    // the hidden face is out of the accessible name and carries no live status
    expect(button.querySelector(".ib-btn__face--busy")?.getAttribute("aria-hidden")).toBe("true")
    expect(button.querySelector('[role="status"]')).toBeNull()
  })
})
