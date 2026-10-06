"use client"

import { useMemo, useSyncExternalStore } from "react"

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange)
  return () => window.removeEventListener("popstate", onChange)
}

/**
 * The query string of the current page, read on the client only.
 *
 * Unlike next/navigation's useSearchParams it does not need a Suspense boundary, so a page that calls it is still
 * rendered into the static HTML (heading, form, side panel). Returns null on the server and during hydration;
 * a screen whose content depends on a parameter (a reset token) shows its loader until it is not null.
 */
export function useUrlParams(): URLSearchParams | null {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => null,
  )
  return useMemo(() => (search === null ? null : new URLSearchParams(search)), [search])
}
