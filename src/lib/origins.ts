// All browser-facing application origins derive from the one public domain.
// NEXT_PUBLIC_API_DOMAIN overrides the API host (bare host, no scheme), e.g. to
// point this app at another backend. Empty origin intentionally means
// same-origin during local development.
const domain = process.env.NEXT_PUBLIC_DOMAIN?.trim() ?? ""
export const publicDomain = domain

const origin = (override: string | undefined, fallback: string) => {
  const host = override?.trim() || fallback
  return host ? `https://${host}` : ""
}

export const apiOrigin = origin(process.env.NEXT_PUBLIC_API_DOMAIN, domain && `api.${domain}`)
export const mainOrigin = domain ? `https://${domain}` : "/"
