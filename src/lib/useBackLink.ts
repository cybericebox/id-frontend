"use client"

import { functionalAllowed } from "@/lib/consent"
import { useEffect, useState } from "react"
import { adminOrigin, apiOrigin, eventDomain, exercisesOrigin, idOrigin, mainHost } from "@/lib/origins"
import { backHosts, resolveBack, type BackLink } from "@/lib/backLink"

const HOSTS = backHosts({ main: mainHost, eventDomain }, {
  admin: adminOrigin,
  exercises: exercisesOrigin,
  id: idOrigin,
  api: apiOrigin,
})

// The remembered source is functional storage: without functional consent nothing is kept (the link lives for the page).
function tabStorage(): Storage | null {
  try {
    return functionalAllowed() ? window.sessionStorage : null
  } catch {
    return null
  }
}

/** The back link for id pages: lib/backLink with this platform's hosts. */
export function resolveIdBack(returnTo: string | null, referrer: string, currentHost: string, storage: Storage | null): BackLink | null {
  return resolveBack({ returnTo, referrer, currentHost }, HOSTS, storage)
}

/** Where this page's back arrow leads, resolved in the browser. */
export function useBackLink(returnTo: string | null): BackLink | null {
  const [link, setLink] = useState<BackLink | null>(null)
  useEffect(() => {
    const next = resolveIdBack(returnTo, document.referrer, window.location.hostname, tabStorage())
    queueMicrotask(() => setLink(next))
  }, [returnTo])
  return link
}
