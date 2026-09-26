import { cn } from "@/utils/cn"
import { t } from "@/i18n/t"
import { CREST_SRC } from "@/components/brand/Logo"
import "./spinner.css"

const SIZE_CLASS = {
  sm: "crest-loader-sm",
  md: "crest-loader-md",
  lg: "crest-loader-lg",
} as const

// Small inline activity indicator. Page and area loaders can show progress text.
export function Spinner({
  size = "sm",
  label,
  className,
}: {
  size?: "sm" | "md" | "lg"
  label?: string
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label={label ? undefined : "loading"}
      className={cn("inline-flex items-center justify-center leading-none", className)}
    >
      <span
        aria-hidden="true"
        className={cn("crest-loader", SIZE_CLASS[size])}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CREST_SRC} alt="" />
      </span>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

export function LoadingArea({ label, message, className }: { label?: string; message?: string; className?: string }) {
  return <div className={cn("loading-area", className)}><Spinner size="lg" label={label ?? message ?? t("common.loading")} />{message && <span className="loading-area-label" aria-hidden="true">{message}</span>}</div>
}

// Full-screen centered loader for page-level loading states.
export function PageLoader({ label, message }: { label?: string; message?: string }) {
  return (
    <div className="loading-area loading-area-page fixed inset-0 z-50 bg-paper">
      <Spinner size="lg" label={label ?? message ?? t("common.loading")} />
      {message && <span className="loading-area-label" aria-hidden="true">{message}</span>}
    </div>
  )
}
