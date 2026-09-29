import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/utils/cn"
import "./tooltip.css"

// ds-v2 .ib-tip: short hover hint for icon-only controls (CSS only: shows on
// hover after 300 ms and on keyboard focus). The trigger gets aria-describedby.
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
  return (
    <span
      className={cn(
        "ib-tip",
        side === "bottom" && "ib-tip--bottom",
        align === "start" && "ib-tip--start",
        align === "end" && "ib-tip--end",
        className
      )}
    >
      <Slot aria-describedby={id}>{children}</Slot>
      <span className="ib-tip__bubble" role="tooltip" id={id}>
        {content}
      </span>
    </span>
  )
}
