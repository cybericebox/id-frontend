"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

/**
 * Reads a one-time URL flag (e.g. ?google_error=failed set by a backend
 * redirect), then removes it from the URL so a reload or a bookmark does not
 * show the message again. Returns the value and a clear() for when the user
 * retries. `params` comes from useUrlParams (null until the client knows the URL).
 *
 * The flag is removed through the Next router, NOT window.history.replaceState:
 * a raw replaceState keeps Next's own history entry (its renderedSearch still
 * has the flag), and a reload restored the message from it.
 */
export function useOneShotParam(name: string, params: URLSearchParams | null): [string | null, () => void] {
  const [value, setValue] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!params?.has(name)) return
    setValue(params.get(name))
    const rest = new URLSearchParams(params.toString())
    rest.delete(name)
    const query = rest.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [name, pathname, router, params])

  return [value, () => setValue(null)]
}
