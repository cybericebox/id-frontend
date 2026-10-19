import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/cn"
import { CrestMark } from "@/components/ui/spinner"
import "./button.css"

const buttonVariants = cva(
  // ds-v2 .ib-btn: 40 px default, radius 6, medium 14, no shadows.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-action bg-action text-on-action hover:border-action-hover hover:bg-action-hover",
        destructive:
          "border-danger bg-danger text-on-action hover:bg-[color-mix(in_srgb,var(--ib-danger)_88%,var(--ib-ink))] active:bg-[color-mix(in_srgb,var(--ib-danger)_80%,var(--ib-ink))]",
        outline:
          "border-control bg-transparent text-ink hover:bg-hover",
        secondary:
          "border-control bg-transparent text-ink hover:bg-hover",
        ghost: "border-transparent text-ink hover:bg-hover",
        link: "border-transparent text-action underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "ib-tap h-8 px-3 text-xs",
        lg: "h-10 px-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// A button that can be busy must say what it is doing: `busyLabel` is required whenever `busy` is passed.
type BusyProps = { busy?: undefined; busyLabel?: undefined } | { busy: boolean; busyLabel: string }

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> &
  BusyProps & {
    asChild?: boolean
  }

// Busy state (AGENTS.md «Busy buttons show the operation»): the button is disabled and shows the crest with the
// operation in the present tense («Зберігаємо…») in place of its label. Both faces share one grid cell, so the button
// keeps the width of the wider one and never jumps; the hidden face stays out of the accessible name.
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, busy = false, busyLabel, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        {...props}
      >
        {busyLabel === undefined || asChild ? children : (
          <span className="ib-btn__faces">
            <span className="ib-btn__face" aria-hidden={busy || undefined}>{children}</span>
            <span className="ib-btn__face ib-btn__face--busy" aria-hidden={!busy || undefined}>
              {busy ? <CrestMark /> : <span className="ib-btn__mark" />}
              {busyLabel}
            </span>
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
