import type { NextConfig } from "next"

// Static export for id-frontend (identity / auth portal).
// - output: 'export' (production builds only) produces the `out/` directory for static hosting (nginx);
//   `next dev` runs as a normal Next app.
// - images.unoptimized: true is required when using static export (no server-side image optimization).
// Dev-only: served through the nginx edge on the real domain (not localhost),
// so Next's dev resources (fonts, HMR) are cross-origin and blocked by default.
// Allow the platform domain + subdomains, derived from NEXT_PUBLIC_DOMAIN.
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  images: {
    unoptimized: true,
  },
  // No 308 slash-normalising redirects. They are "permanent", so browsers cache
  // them forever; an old cached /x → /x/ (from when trailingSlash was on) plus a
  // live /x/ → /x makes ERR_TOO_MANY_REDIRECTS. Static hosting never redirects.
  skipTrailingSlashRedirect: true,
  // Dev-only: platform domains are always allowed, so `next dev` works behind the
  // local proxy/tunnel even when NEXT_PUBLIC_DOMAIN is not set.
  allowedDevOrigins: [...new Set([...(DOMAIN ? [DOMAIN] : []), "cybericebox.com", "cybericebox-dev.pp.ua", "cybericebox.pp.ua"])].flatMap((d) => [d, `*.${d}`]),
}

export default nextConfig
