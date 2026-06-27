import * as React from "react"

import { cn } from "@/utils/cn"

/** Inline spinner — size/color via className (h-*, w-*, text-*). */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

/** Full-screen centered loader for page-level loading states. */
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Spinner className="h-10 w-10 text-primary" />
    </div>
  )
}
