// Browser-facing application origins, each from its own env host (bare host, no scheme).
// There is no fallback: next.config.ts fails the build and the container entrypoint fails
// the start when a host is missing.
const origin = (host: string | undefined) => `https://${host?.trim()}`

export const mainHost = process.env.NEXT_PUBLIC_MAIN_HOST?.trim() ?? ""
export const idHost = process.env.NEXT_PUBLIC_ID_HOST?.trim() ?? ""
/** Event sites are <tag>.<eventDomain>; also the parent domain of the shared theme/consent cookies. */
export const eventDomain = process.env.NEXT_PUBLIC_EVENT_DOMAIN?.trim() ?? ""

export const mainOrigin = origin(process.env.NEXT_PUBLIC_MAIN_HOST)
export const idOrigin = origin(process.env.NEXT_PUBLIC_ID_HOST)
export const apiOrigin = origin(process.env.NEXT_PUBLIC_API_HOST)
export const adminOrigin = origin(process.env.NEXT_PUBLIC_ADMIN_HOST)
export const exercisesOrigin = origin(process.env.NEXT_PUBLIC_EXERCISES_HOST)
