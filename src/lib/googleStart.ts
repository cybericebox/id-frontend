import * as z from "zod"
import { apiUrl } from "@/api/client"

const email = z.string().email()

/** The address for Google's login_hint: the valid one typed in the form, else the caller's (?login_hint=), else "". */
export function googleHint(typed: string | undefined, fromUrl: string | null | undefined): string {
  for (const value of [typed, fromUrl]) {
    const address = (value ?? "").trim().toLowerCase()
    if (address && email.safeParse(address).success) return address
  }
  return ""
}

/** A Google start on the API (a top-level navigation) with the optional return_to and login_hint. */
export function googleStartUrl(path: string, { returnTo, loginHint }: { returnTo?: string; loginHint?: string }): string {
  const query = new URLSearchParams()
  if (returnTo) query.set("return_to", returnTo)
  if (loginHint) query.set("login_hint", loginHint)
  const q = query.toString()
  return apiUrl(q ? `${path}?${q}` : path)
}
