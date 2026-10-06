import { describe, expect, it } from "vitest"
import type { KeyboardEvent } from "react"
import { nextTabIndex } from "./tablist"

const key = (name: string) => ({ key: name }) as KeyboardEvent

describe("nextTabIndex", () => {
  it("moves along the vertical axis and wraps", () => {
    expect(nextTabIndex(key("ArrowDown"), 0, 3, "vertical")).toBe(1)
    expect(nextTabIndex(key("ArrowDown"), 2, 3, "vertical")).toBe(0)
    expect(nextTabIndex(key("ArrowUp"), 0, 3, "vertical")).toBe(2)
    expect(nextTabIndex(key("ArrowRight"), 0, 3, "vertical")).toBeNull()
  })

  it("moves along the horizontal axis and wraps", () => {
    expect(nextTabIndex(key("ArrowRight"), 2, 3, "horizontal")).toBe(0)
    expect(nextTabIndex(key("ArrowLeft"), 0, 3, "horizontal")).toBe(2)
    expect(nextTabIndex(key("ArrowDown"), 0, 3, "horizontal")).toBeNull()
  })

  it("Home and End jump to the ends, other keys are ignored", () => {
    expect(nextTabIndex(key("Home"), 2, 5, "horizontal")).toBe(0)
    expect(nextTabIndex(key("End"), 2, 5, "vertical")).toBe(4)
    expect(nextTabIndex(key("a"), 2, 5, "vertical")).toBeNull()
  })
})
