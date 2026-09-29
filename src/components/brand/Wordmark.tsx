import * as React from "react"
import { mainOrigin } from "@/lib/origins"
import { Logo } from "./Logo"
import { t } from "@/i18n/t"

// The landing (apex) origin — the brand lockup links here by default so the
// organisation logo navigates home from every app.
const LANDING_HREF = mainOrigin

// Brand lockup — the old crest logo plus the «Cyber ICE Box» wordmark (ICE in crest ice blue). Links to the
// landing by default; pass href={null} to render a non-linking lockup.
export function Wordmark({
  className,
  withMark = true,
  size = "md",
  href,
}: {
  className?: string
  withMark?: boolean
  size?: "sm" | "md" | "lg"
  /** Link target; defaults to the landing (apex). Pass `null` for no link. */
  href?: string | null
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg"
  const mark = size === "lg" ? 40 : size === "sm" ? 24 : 30
  const lockup = (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${text} ${className ?? ""}`}>
      {withMark && <Logo size={mark} href={null} />}
      <span className="text-ink">
        Cyber <span className="text-ice">ICE</span> Box
      </span>
    </span>
  )
  const target = href === null ? null : href ?? LANDING_HREF
  if (!target) return lockup
  return (
    <a href={target} aria-label={t("meta.brand")} className="inline-flex no-underline">
      {lockup}
    </a>
  )
}
