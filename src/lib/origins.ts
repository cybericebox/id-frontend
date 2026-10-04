// Browser-facing application origins. Every host derives from the one base domain NEXT_PUBLIC_DOMAIN (src/lib/hosts.ts); a missing
// domain fails the build (next.config.ts) and the container start (entrypoint).
import { hosts } from "@/lib/hosts"

const h = hosts()
const origin = (host: string) => `https://${host}`

export const mainHost = h.main
export const idHost = h.id
/** Event sites are <tag>.<eventDomain>; also the parent domain of the shared theme/consent cookies. */
export const eventDomain = h.eventDomain

export const mainOrigin = origin(h.main)
export const idOrigin = origin(h.id)
export const apiOrigin = origin(h.api)
export const adminOrigin = origin(h.admin)
export const exercisesOrigin = origin(h.exercises)
