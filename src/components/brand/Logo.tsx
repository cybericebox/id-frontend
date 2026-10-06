import * as React from "react"
import { mainOrigin } from "@/lib/origins"
import { t } from "@/i18n/t"

// The original CyberICEBox (ICE CTF) crest emblem — the brand logo used across
// the apps (shipped as favicon). Served as a static file from public/ (DS asset crest-128.png, 128x125),
// not inlined, so the HTML and the JS bundle stay small.
export const CREST_SRC = "/crest-128.png"

export interface LogoProps {
  /** Rendered height in px (width scales with the 128:125 aspect). */
  size?: number
  className?: string
  /**
   * Where the brand mark links. Defaults to the landing (apex) origin so the
   * organisation logo navigates home from every app. Pass `null` to render a
   * non-linking mark (e.g. when an ancestor already wraps it in an anchor).
   */
  href?: string | null
  /** Alt text; pass "" when the visible lockup text already names the brand. */
  alt?: string
}

// The landing origin (the base domain).
const LANDING_HREF = mainOrigin

export function Logo({ size = 64, className, href, alt }: LogoProps) {
  const img = (
    <img
      src={CREST_SRC}
      alt={alt ?? t("meta.brand")}
      width={Math.round((size * 128) / 125)}
      height={size}
      className={className}
      style={{ display: "inline-block", objectFit: "contain" }}
    />
  )
  const target = href === null ? null : href ?? LANDING_HREF
  if (!target) return img
  return (
    <a href={target} aria-label={t("meta.brand")} style={{ display: "inline-flex", lineHeight: 0 }}>
      {img}
    </a>
  )
}
