import { hosts } from "@/lib/hosts"
import { functionalAllowed } from "@/lib/consent"
import { COOKIE_SIGNED_IN } from "@/lib/storageKeys"

/**
 * The sign-in hint (parent domain, readable by JS, «1», no personal data) is set by the backend on a sign-in. A flow that
 * ends in a session on the client side (Google link confirm) sets it the same way, and only with functional consent.
 */
export function setSignedHint(): void {
  if (typeof document === "undefined" || !functionalAllowed()) return
  const secure = location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${COOKIE_SIGNED_IN}=1; path=/; domain=.${hosts().cookieDomain}; SameSite=Lax${secure}`
}
