import { apiPost } from "./client"

// The backend confirms the owner (the password, or a recent sign-in for an account without one) and answers with
// the Google consent URL; the link itself is made by the OAuth callback.
export async function startGoogleLink(password?: string): Promise<string> {
  const res = await apiPost<{ Url: string }>(
    "/api/auth/google/link",
    password === undefined ? undefined : { CurrentPassword: password }
  )
  return res.Url
}
