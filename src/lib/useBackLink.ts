"use client"

import { useEffect, useState } from "react"
import { adminOrigin, apiOrigin, exercisesOrigin, publicDomain } from "@/lib/origins"
import { backHosts, resolveBack, type BackLink } from "@/lib/backLink"

const HOSTS = backHosts(publicDomain, {
  admin: adminOrigin,
  exercises: exercisesOrigin,
  id: process.env.NEXT_PUBLIC_ID_DOMAIN?.trim() ? `https://${process.env.NEXT_PUBLIC_ID_DOMAIN.trim()}` : publicDomain && `https://id.${publicDomain}`,
  api: apiOrigin,
})

function tabStorage(): Storage | null {
  try {
    return window.sessionStorage
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
