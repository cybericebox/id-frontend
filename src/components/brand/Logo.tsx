import * as React from "react"
import Link from "next/link"
import { t } from "@/i18n/t"

// The original CyberICEBox (ICE CTF) crest emblem — the brand logo used across
// the apps (shipped as favicon). Served as a lossless WebP from public/ (128x125),
// not inlined, so the HTML and the JS bundle stay small.
export const CREST_SRC = "/crest-128.webp"

export interface LogoProps {
  /** Rendered height in px (width scales with the 128:125 aspect). */
  size?: number
  className?: string
  /**
   * Where the brand mark links. By default it leads to NEXT_PUBLIC_MAIN_SITE_URL when that is set and to `/` of this site when it is not
   * (two anchors, one of them hidden by src/styles/cfg.css). Pass `null` to render a non-linking mark (e.g. when an ancestor already
   * wraps it in an anchor).
   */
  href?: string | null
  /** Alt text; pass "" when the visible lockup text already names the brand. */
  alt?: string
}

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
  if (href === null) return img
  const anchor = { "aria-label": t("meta.brand"), style: { display: "inline-flex", lineHeight: 0 } } as const
  if (href !== undefined) return <a href={href} {...anchor}>{img}</a>
  return (
    <>
      <a className="cfg-main-only" href={process.env.NEXT_PUBLIC_MAIN_SITE_URL} {...anchor}>{img}</a>
      <Link className="cfg-main-off" href="/" prefetch={false} {...anchor}>{img}</Link>
    </>
  )
}
