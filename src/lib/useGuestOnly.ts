"use client"

import { useEffect } from "react"
import { redirectIfAuthed, rememberReturnTo } from "@/lib/auth"
import { onServiceRestored } from "@/lib/serviceStatus"

/**
 * Guest-only page behaviour that runs next to an already visible form: remember where to return after sign-in and
 * bounce a signed-in user away once `/me` answers. Nothing is rendered or blocked while the probe runs; a failed
 * probe (API down) leaves the form usable under the service notice and is retried when the service is back.
 * `ready` is false until the page's URL parameters are known.
 */
export function useGuestOnly(ready: boolean, returnTo: string | undefined, redirectTo = returnTo) {
  useEffect(() => {
    if (!ready) return
    rememberReturnTo(returnTo)
    const check = () => { void redirectIfAuthed(redirectTo).catch(() => {}) }
    check()
    return onServiceRestored(check)
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, [ready])
}
