import { cn } from "@/utils/cn"
import { t } from "@/i18n/t"
import { CREST_SRC } from "@/components/brand/Logo"
import "./spinner.css"

const SIZE_CLASS = {
  sm: "crest-loader-sm",
  md: "crest-loader-md",
  lg: "crest-loader-lg",
} as const

// Branded crest loader: the CyberICEBox crest with a light sweep across it
// (sweep clipped to the crest silhouette). Size scales off font-size (1em tall).
// `label` is announced to screen readers; without it a generic aria-label is used.
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
        style={{ ["--crest-src" as string]: `url(${CREST_SRC})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CREST_SRC} alt="" />
      </span>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

// Full-screen centered loader for page-level loading states: solid paper
// (no blur, no shadow), crest loader only. The label is for screen readers.
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper">
      <Spinner size="lg" label={label ?? t("common.loading")} />
    </div>
  )
}
