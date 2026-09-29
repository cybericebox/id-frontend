// All browser-facing application origins derive from the one public domain.
// NEXT_PUBLIC_{API,ADMIN,EXERCISES}_DOMAIN override a single host (bare host, no
// scheme), e.g. to point this app at another backend. Empty origin intentionally means
// same-origin during local development.
const domain = process.env.NEXT_PUBLIC_DOMAIN?.trim() ?? ""
export const publicDomain = domain

const origin = (override: string | undefined, fallback: string) => {
  const host = override?.trim() || fallback
  return host ? `https://${host}` : ""
}

export const apiOrigin = origin(process.env.NEXT_PUBLIC_API_DOMAIN, domain && `api.${domain}`)
export const adminOrigin = origin(process.env.NEXT_PUBLIC_ADMIN_DOMAIN, domain && `admin.${domain}`)
export const exercisesOrigin = origin(process.env.NEXT_PUBLIC_EXERCISES_DOMAIN, domain && `exercises.${domain}`)
export const mainOrigin = domain ? `https://${domain}` : "/"
