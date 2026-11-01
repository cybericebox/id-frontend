import { apiPost } from "@/api/client"

// PROVISIONAL contract of the Google link-confirm step (daemon-hardening will send the final one): sign-in with Google
// for an existing, not yet Google-linked account of a non-Gmail address ends here instead of in a session. The ticket
// comes in the URL (?token=). Paths and field names below are placeholders until then; only this file changes.
const BASE = "/api/auth/google/confirm"

/** Confirms the owner with the account password; the backend links Google, opens the session and says where to go. */
export async function confirmGoogleWithPassword(ticket: string, password: string): Promise<{ RedirectURL: string }> {
  return apiPost(BASE, { Ticket: ticket, CurrentPassword: password }, undefined, { required: false })
}

/** Mails the confirmation code to the account address. Resolves with the wait before the next mail, when the backend says. */
export async function sendGoogleConfirmCode(ticket: string, recaptchaToken: string): Promise<number | void> {
  const data = await apiPost<{ RetryAfterSeconds?: number } | undefined>(`${BASE}/code`, { Ticket: ticket, RecaptchaToken: recaptchaToken }, undefined, { required: false })
  return data?.RetryAfterSeconds
}

/** Confirms the owner with the mailed code; same outcome as the password. */
export async function confirmGoogleWithCode(ticket: string, code: string): Promise<{ RedirectURL: string }> {
  return apiPost(`${BASE}/finish`, { Ticket: ticket, Code: code }, undefined, { required: false })
}
