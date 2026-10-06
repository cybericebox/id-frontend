import type { KeyboardEvent } from "react"

/**
 * Keyboard model of a WAI-ARIA tablist (automatic activation): the arrows along the list axis move between the tabs
 * and wrap around, Home and End jump to the ends. Returns the index to select, or null when the key is not for the
 * tablist. The caller selects that tab and calls `focusTab` (the tabs sit in one DOM parent, `role="tab"`).
 */
export function nextTabIndex(event: KeyboardEvent, index: number, count: number, orientation: "horizontal" | "vertical"): number | null {
  const prev = orientation === "vertical" ? "ArrowUp" : "ArrowLeft"
  const next = orientation === "vertical" ? "ArrowDown" : "ArrowRight"
  switch (event.key) {
    case prev: return (index - 1 + count) % count
    case next: return (index + 1) % count
    case "Home": return 0
    case "End": return count - 1
    default: return null
  }
}

/** Moves DOM focus to the tab at `index` inside the tablist that contains `from`. */
export function focusTab(from: HTMLElement, index: number) {
  const list = from.closest<HTMLElement>('[role="tablist"]')
  list?.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus()
}
