"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/utils/cn"
import "./tooltip.css"

// ds-v2 .ib-tip: short hover hint for icon-only controls (CSS only: shows on
// hover after 300 ms and on keyboard focus; a tap toggles it where hover does not exist). The trigger gets aria-describedby.
// Esc hides an open bubble without moving focus (WCAG 1.4.13); it returns on the next hover or focus.
export function Tooltip({
  content,
  side = "top",
  align = "center",
  className,
  children,
}: {
  content: React.ReactNode
  side?: "top" | "bottom"
  align?: "center" | "start" | "end"
  className?: string
  children: React.ReactElement
}) {
  const id = React.useId()
  const [dismissed, setDismissed] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  return (
    <span
      className={cn(
        "ib-tip",
        side === "bottom" && "ib-tip--bottom",
        align === "start" && "ib-tip--start",
        align === "end" && "ib-tip--end",
        dismissed && "is-dismissed",
        open && "is-open",
        className
      )}
      onKeyDown={(event) => { if (event.key === "Escape") { setDismissed(true); setOpen(false) } }}
      onMouseEnter={() => setDismissed(false)}
      onBlur={() => { setDismissed(false); setOpen(false) }}
      onClick={() => { if (!window.matchMedia("(hover:hover)").matches) setOpen((value) => !value) }}
    >
      <Slot aria-describedby={id}>{children}</Slot>
      <span className="ib-tip__bubble" role="tooltip" id={id}>
        {content}
      </span>
    </span>
  )
}
