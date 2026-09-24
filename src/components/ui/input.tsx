import * as React from "react"

import { cn } from "@/utils/cn"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // ds-v2 .ib-input
          "flex h-10 w-full rounded-md border border-control bg-surface px-3 text-sm text-ink caret-action transition-colors placeholder:text-faint hover:border-dim file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-2 focus:-outline-offset-1 focus:outline-action focus:border-action aria-invalid:border-danger aria-invalid:focus:outline-danger disabled:cursor-not-allowed disabled:border-line disabled:text-faint read-only:border-line read-only:bg-paper read-only:text-dim",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
