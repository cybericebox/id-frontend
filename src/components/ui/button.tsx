import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/cn"
import { Spinner } from "@/components/ui/spinner"

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
        sm: "h-8 px-3 text-[13px]",
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

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Busy state: disables the button and shows the crest loader before the label. */
  busy?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, busy = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        {...props}
      >
        {busy && !asChild ? <><Spinner size="sm" />{children}</> : children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
