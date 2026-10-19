"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { urlTokenKey } from "@/lib/storageKeys"

/** Query parameters that carry a one-time secret; they never stay in the address (history, analytics, screenshots). */
export const SECRET_PARAMS = ["token", "code"] as const

function stored(pathname: string): string | null {
  try {
    return sessionStorage.getItem(urlTokenKey(pathname))
  } catch {
    return null
  }
}

/**
 * The one-time token of this page (?token=, or the legacy ?code=). Once read it is removed from the address through
 * the Next router (like useOneShotParam) and kept for the tab, so a reload still works. `params` comes from
 * useUrlParams: null until the client knows the URL, and so is the result; "" when there is no token.
 */
export function useUrlToken(params: URLSearchParams | null): string | null {
  const router = useRouter()
  const pathname = usePathname()
  const fromUrl = params ? (params.get("token") ?? params.get("code")) : null
  // also kept in memory: without sessionStorage the page still has the token after the address drops it
  const [kept, setKept] = useState<string | null>(null)

  useEffect(() => {
    if (!params || fromUrl === null) return
    setKept(fromUrl)
    try {
      sessionStorage.setItem(urlTokenKey(pathname), fromUrl)
    } catch {
      /* storage may be unavailable: the token still works until a reload */
    }
    const rest = new URLSearchParams(params.toString())
    for (const name of SECRET_PARAMS) rest.delete(name)
    const query = rest.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [fromUrl, params, pathname, router])

  if (!params) return null
  return fromUrl ?? kept ?? stored(pathname) ?? ""
}

/** Drops the kept token of this page once it is used up (the flow finished). */
export function forgetUrlToken(): void {
  try {
    sessionStorage.removeItem(urlTokenKey(window.location.pathname))
  } catch {
    /* storage may be unavailable */
  }
}
