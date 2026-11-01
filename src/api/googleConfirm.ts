import { apiGet, apiPost } from "@/api/client"

// PROVISIONAL contract of the Google link-confirm step (daemon-hardening will send the final one): sign-in with Google
// for an existing, not yet Google-linked account of a non-Gmail address ends here instead of in a session. The pending
// link lives in an HttpOnly cookie bound to this browser (credentials are sent by the api client); nothing secret is in
// the URL or in the requests. Paths and field names below are placeholders until then; only this file changes.
const BASE = "/api/auth/google/confirm"

/** The Google account that is about to be linked and what the owner can confirm with. */
export interface PendingGoogleLink {
  GoogleEmail: string
  GoogleName: string
  HasPassword: boolean
}

/** The pending link of this browser; rejects (4xx) when there is none or it expired. */
export function getPendingGoogleLink(): Promise<PendingGoogleLink> {
  return apiGet<PendingGoogleLink>(BASE, undefined, { required: false })
}

/** Confirms the owner with the account password; the backend links Google, opens the session and says where to go. */
export async function confirmGoogleWithPassword(password: string): Promise<{ RedirectURL: string }> {
  return apiPost(BASE, { CurrentPassword: password }, undefined, { required: false })
}

/** Mails the confirmation code to the account address. Resolves with the wait before the next mail, when the backend says. */
export async function sendGoogleConfirmCode(recaptchaToken: string): Promise<number | void> {
  const data = await apiPost<{ RetryAfterSeconds?: number } | undefined>(`${BASE}/code`, { RecaptchaToken: recaptchaToken }, undefined, { required: false })
  return data?.RetryAfterSeconds
}

/** Confirms the owner with the mailed code; same outcome as the password. */
export async function confirmGoogleWithCode(code: string): Promise<{ RedirectURL: string }> {
  return apiPost(`${BASE}/finish`, { Code: code }, undefined, { required: false })
}
