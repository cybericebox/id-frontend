import { apiPost } from "@/api/client"
import { executeCaptcha } from "@/lib/captcha"
import { getPasskey, type PasskeyCeremony } from "@/lib/passkey"

/**
 * Usernameless passkey sign-in: the bot check and a ceremony from the backend, the browser's assertion, then the
 * backend opens the session and answers with where to go. `conditional` offers the passkeys in the autofill of the
 * email field instead of a modal prompt. Resolves with the RedirectURL ("" when the backend gave none).
 */
export async function signInWithPasskey(opts: { returnTo?: string; conditional?: boolean; signal?: AbortSignal }): Promise<string> {
  const RecaptchaToken = await executeCaptcha("passkeySignIn")
  // required:false — a 401 means the key was rejected and is shown inline, not "go to sign-in".
  const ceremony = await apiPost<PasskeyCeremony>("/api/auth/passkeys/sign-in/begin", { RecaptchaToken }, undefined, { required: false })
  const Credential = await getPasskey(ceremony.Options, { conditional: opts.conditional, signal: opts.signal })
  const { RedirectURL } = await apiPost<{ RedirectURL: string }>(
    "/api/auth/passkeys/sign-in/finish",
    { CeremonyID: ceremony.CeremonyID, Credential, ...(opts.returnTo ? { Redirect: opts.returnTo } : {}) },
    undefined,
    { required: false },
  )
  return RedirectURL
}
