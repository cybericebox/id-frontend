// @vitest-environment jsdom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/profile" }))

import { ApiError } from "@/api/client"
import { ErrorScreen, NotFoundScreen } from "./ErrorPage"
import { reference } from "@/lib/errorReport"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const host = document.body.appendChild(document.createElement("div"))
const root = createRoot(host)
const draw = (node: React.ReactNode) => act(() => root.render(node))
const link = () => [...host.querySelectorAll("a")].find((a) => a.textContent === "Повідомити деталі")
const api = (status: number, requestId?: string) => new ApiError(status, undefined, undefined, undefined, 50310, undefined, requestId)

afterEach(() => act(() => root.render(null)))

describe("500 page report", () => {
  it("journaled 5xx: reported text, reference code-rid8, copy, prefilled mailto", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    draw(<ErrorScreen onRetry={() => {}} error={api(503, "0a1b2c3d-1111-2222-3333-444455556666")} />)
    expect(host.textContent).toContain("Ми вже отримали звіт про цю помилку")
    expect(host.textContent).toContain("Номер звернення: 50310-0a1b2c3d")
    const href = decodeURIComponent(link()!.getAttribute("href")!)
    expect(href).toContain("subject=Помилка 50310-0a1b2c3d")
    expect(href).toContain("Сторінка: ")
    expect(href).toContain("Що ви робили?")
    await act(async () => { host.querySelector<HTMLButtonElement>("button[aria-label]")!.click() })
    expect(writeText).toHaveBeenCalledWith("50310-0a1b2c3d")
    expect(host.querySelector('[role="status"]')!.textContent).toBe("Скопійовано")
    // the report link sits below the actions and the reference line, not inside the actions row
    const actions = host.querySelector(".ib-error__actions")!
    expect(actions.contains(link()!)).toBe(false)
    expect(host.querySelector(".ib-error__ref")!.compareDocumentPosition(link()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("without a platform code the reference is the request id alone", () => {
    for (const code of [0, undefined]) {
      const error = new ApiError(500, undefined, undefined, undefined, code, undefined, "01a112da-1111-2222-3333-444455556666")
      expect(reference(error)).toBe("01a112da")
      draw(<ErrorScreen onRetry={() => {}} error={error} />)
      expect(host.textContent).toContain("Номер звернення: 01a112da")
      expect(host.textContent).not.toContain("0-01a112da")
      expect(decodeURIComponent(link()!.getAttribute("href")!)).toContain("subject=Помилка 01a112da")
    }
  })

  it("without a readable request id it falls back to the code line", () => {
    draw(<ErrorScreen onRetry={() => {}} error={api(500)} />)
    expect(host.textContent).toContain("Код помилки: 50310")
    expect(host.textContent).not.toContain("Номер звернення")
    expect(reference(api(500))).toBeUndefined()
  })

  it("a JS crash: no «already reported», no number, link carries message and build", () => {
    draw(<ErrorScreen onRetry={() => {}} error={new Error("boom ".repeat(100))} />)
    expect(host.textContent).not.toContain("Ми вже отримали звіт")
    expect(host.textContent).toContain("Сталася непередбачена помилка")
    expect(host.textContent).not.toContain("Номер звернення")
    const href = decodeURIComponent(link()!.getAttribute("href")!)
    expect(href).toContain("Повідомлення: boom")
    expect(href).toContain("Застосунок: Cyber ICE Box ID 0.1.0")
    expect(href.match(/Повідомлення: (.*)/)![1].trim().length).toBeLessThanOrEqual(200)
  })

  it("404 has neither a reference nor a report link", () => {
    draw(<NotFoundScreen />)
    expect(link()).toBeUndefined()
    expect(host.textContent).not.toContain("Номер звернення")
  })
})
