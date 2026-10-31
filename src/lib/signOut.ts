import { apiUrl } from "@/api/client"
import { clearAccountDrafts } from "@/lib/drafts"

/**
 * Ends the session with one POST (credentials included), no confirmation page. Only a 2xx or a 401 (the session is
 * already gone) counts as signed out: the unsaved drafts go then. A network error or a 5xx throws, so the user never
 * leaves a shared computer believing they signed out.
 */
export async function signOutNow(): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/sign-out"), { method: "POST", credentials: "include" })
  if (!res.ok && res.status !== 401) throw Object.assign(new Error("sign-out failed"), { status: res.status })
  clearAccountDrafts()
}
