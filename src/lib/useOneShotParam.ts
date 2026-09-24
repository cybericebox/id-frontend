"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Reads a one-time URL flag (e.g. ?google_error=failed set by a backend
 * redirect), then removes it from the URL so a reload or a bookmark does not
 * show the message again. Returns the value and a clear() for when the user
 * retries.
 *
 * The flag is removed through the Next router, NOT window.history.replaceState:
 * a raw replaceState keeps Next's own history entry (its renderedSearch still
 * has the flag), and a reload restored the message from it.
 */
export function useOneShotParam(name: string, initial: string | null): [string | null, () => void] {
  const [value, setValue] = useState(initial)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!searchParams.has(name)) return
    const rest = new URLSearchParams(searchParams.toString())
    rest.delete(name)
    const query = rest.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [name, pathname, router, searchParams])

  return [value, () => setValue(null)]
}
