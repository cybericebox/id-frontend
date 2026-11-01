import { apiDelete, apiGet, apiPost } from "@/api/client"

// Google link-confirm: sign-in with Google for an existing, not yet Google-linked account of a non-Gmail address ends
// here instead of in a session. The one-time ticket lives in an HttpOnly cookie bound to this browser (sent with
// credentials); nothing secret is in the URL, and the password or code goes to the confirm endpoint only.
const BASE = "/api/auth/google/pending"

/** Code of a missing, expired, used or foreign-browser ticket (404): the page says the request is gone. */
export const GOOGLE_PENDING_GONE = 30436

export interface PendingGoogleLink {
  /** The account's address, masked (o***@example.org). */
  Email: string
  HasPassword: boolean
  /** The Google account that is about to be linked: shown so the owner sees a foreign link is not theirs. */
  GoogleEmail: string
  GoogleName: string
  /** When the last code was mailed (ISO), null when none yet. */
  CodeSentAt: string | null
  ExpiresAt: string
}

export function getPendingGoogleLink(): Promise<PendingGoogleLink> {
  return apiGet<PendingGoogleLink>(BASE, undefined, { required: false })
}

/** Mails a 6-digit code to the account address (10 minutes); resolves with the wait before the next mail. */
export async function sendGoogleConfirmCode(recaptchaToken: string): Promise<number | void> {
  // PROVISIONAL field name (daemon-hardening adds the bot check): RecaptchaToken, as on the other mail requests.
  const data = await apiPost<{ ResendAfterSeconds?: number } | undefined>(`${BASE}/code`, { RecaptchaToken: recaptchaToken }, undefined, { required: false })
  return data?.ResendAfterSeconds
}

/** Exactly one of the password or the mailed code; the backend links Google, opens the session and says where to go. */
export function confirmGoogle(proof: { Password: string } | { Code: string }): Promise<{ RedirectURL: string }> {
  return apiPost(`${BASE}/confirm`, proof, undefined, { required: false })
}

/** «Це не я»: drops the pending link. */
export function declineGoogleLink(): Promise<void> {
  return apiDelete(BASE, undefined, { required: false })
}
