import type { NextConfig } from "next"

// Static export for id-frontend (identity / auth portal).
// - output: 'export' (production builds only) produces the `out/` directory for static hosting (nginx);
//   `next dev` runs as a normal Next app.
// - images.unoptimized: true is required when using static export (no server-side image optimization).

// Every operator value comes from env; a missing one fails the build (no fallbacks).
const REQUIRED = [
  "NEXT_PUBLIC_MAIN_HOST",
  "NEXT_PUBLIC_API_HOST",
  "NEXT_PUBLIC_ID_HOST",
  "NEXT_PUBLIC_ADMIN_HOST",
  "NEXT_PUBLIC_EXERCISES_HOST",
  "NEXT_PUBLIC_EVENT_DOMAIN",
  "NEXT_PUBLIC_COOKIE_DOMAIN",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "NEXT_PUBLIC_PARTNER_URL",
  "NEXT_PUBLIC_PARTNER_SITE_URL",
]
const missing = REQUIRED.filter((name) => !process.env[name]?.trim())
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
}

// Dev-only: the app is served through a proxy on the real hosts (not localhost), so Next's dev
// resources (fonts, HMR) are cross-origin and blocked by default. DEV_ALLOWED_ORIGINS (comma
// list) overrides; otherwise the configured hosts and every event site are allowed.
const hosts = REQUIRED.filter((name) => name.endsWith("_HOST")).map((name) => process.env[name]!.trim())
const eventDomain = process.env.NEXT_PUBLIC_EVENT_DOMAIN!.trim()
const devOrigins = process.env.DEV_ALLOWED_ORIGINS?.trim()
  ? process.env.DEV_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [...new Set([...hosts, eventDomain, `*.${eventDomain}`])]

// Dev-only Content-Security-Policy (`next dev` serves real headers; the export gets its CSP from
// deploy/csp.sh at container start, so `headers` is not defined for production builds).
// Same directives as production, except script-src: dev needs inline scripts and eval (React dev
// stack, HMR) and cannot use hashes, and connect-src also allows the HMR websocket.
// Hosts and vendor toggles come from the same env as production.
function devContentSecurityPolicy(): string {
  const api = `https://${process.env.NEXT_PUBLIC_API_HOST!.trim()}`
  const script = ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
  const connect = ["'self'", api, "ws:", "wss:"]
  let frame = "'none'"
  if (process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim()) {
    script.push("https://www.googletagmanager.com")
    connect.push("https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com", "https://www.google.com/ccm/", "https://*.doubleclick.net")
  }
  const captcha = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER?.trim()
  if (captcha === "recaptcha") {
    script.push("https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/")
    connect.push("https://www.google.com/recaptcha/")
    frame = "https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/"
  } else if (captcha === "turnstile") {
    script.push("https://challenges.cloudflare.com")
    connect.push("https://challenges.cloudflare.com")
    frame = "https://challenges.cloudflare.com"
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    `frame-src ${frame}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "development"
    ? { headers: async () => [{ source: "/:path*", headers: [{ key: "Content-Security-Policy", value: devContentSecurityPolicy() }] }] }
    : {}),
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  images: {
    unoptimized: true,
  },
  // No 308 slash-normalising redirects. They are "permanent", so browsers cache
  // them forever; an old cached /x → /x/ (from when trailingSlash was on) plus a
  // live /x/ → /x makes ERR_TOO_MANY_REDIRECTS. Static hosting never redirects.
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: devOrigins,
}

export default nextConfig
