import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/cn"

const alertVariants = cva(
  // ds-v2 banner look: tinted fill, no border accent, radius 6.
  "relative w-full rounded-md px-3 py-2.5 text-[13px] font-medium [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-3 [&>svg]:size-4 [&>svg~*]:pl-6",
  {
    variants: {
      variant: {
        default: "bg-hero text-ink [&>svg]:text-dim",
        destructive: "bg-danger-bg text-danger [&>svg]:text-danger",
        success: "bg-ok-bg text-ok [&>svg]:text-ok",
        // notice that needs the user's action (not an error): amber tint, readable in both themes
        warn: "bg-warn-bg text-warn [&>svg]:text-warn",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    // errors and notices that need the user interrupt the screen reader; neutral and success text only waits for it
    role={variant === "destructive" || variant === "warn" ? "alert" : "status"}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
