"use client"

import * as React from "react"

import { Input, type InputProps } from "@/components/ui/input"
import { t } from "@/i18n/t"
import { cn } from "@/utils/cn"

// ds-v2 .ib-input-wrap--password: input + «Показати» / «Сховати» text button.
const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  ({ className, ...props }, ref) => {
    const [shown, setShown] = React.useState(false)
    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={shown ? "text" : "password"}
          className={cn("pr-24", className)}
          {...props}
        />
        {!props.disabled && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            className="absolute inset-y-1 right-1 inline-flex items-center rounded-sm px-2.5 text-[13px] font-medium text-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-action"
          >
            {shown ? t("common.hide") : t("common.show")}
          </button>
        )}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
