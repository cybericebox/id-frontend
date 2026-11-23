// The second factor of the account and the step-up (backend routes N25-N29, access-control design §6.6). Every call
// passes required:false: a 401 here is a step-up request or a rejected confirmation, shown in place, never "go to sign-in".
import { apiDelete, apiGet, apiPost, STEP_UP_REQUIRED, type ApiOptions } from "@/api/client"
import { getPasskey, type PasskeyCeremony } from "@/lib/passkey"

export { STEP_UP_REQUIRED }

// Stable codes (messages/errors.*.json, synced from the backend catalog).
export const TOTP_INVALID_CODE = 23802
export const TOTP_SETUP_EXPIRED = 23805
export const LAST_FACTOR = 23806
export const STEP_UP_FAILED = 23808
export const STEP_UP_METHOD_NOT_ALLOWED = 23809
export const TOTP_CODE_USED = 23811
export const WRONG_PASSWORD = 20410
export const REAUTH_REQUIRED = 60429

/** How a step-up (or the session behind it) was confirmed. */
export type StepUpMethod = "passkey" | "totp" | "password" | "recent-sign-in" | "recovery-code"

/** GET /api/auth/second-factor. */
export interface SecondFactorStatus {
  TOTPEnabled: boolean
  TOTPConfirmedAt: string | null
  /** Passkeys that count as a factor (user verification, not compromised). */
  Passkeys: number
  RecoveryCodesLeft: number
  HasSecondFactor: boolean
  /** The step-up of this session while it is fresh; null otherwise. */
  StepUpMethod: StepUpMethod | null
  StepUpExpiresAt: string | null
}

export interface TotpEnrolment {
  /** base32, for typing into the app */
  Secret: string
  /** otpauth:// URI, drawn as the QR code */
  URI: string
}

/** The methods a person picks from to confirm. */
export type ConfirmMethod = "totp" | "passkey" | "password"

/** What the person entered for the chosen method. */
export type ConfirmInput = { code?: string; password?: string }

const OPTS: ApiOptions = { required: false }

export function getSecondFactorStatus(): Promise<SecondFactorStatus> {
  return apiGet<SecondFactorStatus>("/api/auth/second-factor")
}

/** N25: a new secret. The first factor confirms with the current password (or a fresh step-up). */
export function beginTotp(currentPassword?: string): Promise<TotpEnrolment> {
  return apiPost<TotpEnrolment>("/api/auth/totp/begin", currentPassword ? { CurrentPassword: currentPassword } : {}, undefined, OPTS)
}

/** N26: the first code. Returns the 10 recovery codes for the first factor, [] for a further one. */
export async function finishTotp(code: string): Promise<string[]> {
  const data = await apiPost<{ RecoveryCodes: string[] | null }>("/api/auth/totp/finish", { Code: code }, undefined, OPTS)
  return data?.RecoveryCodes ?? []
}

/** N27: needs a step-up made with a factor or a recovery code. */
export function removeTotp(): Promise<void> {
  return apiDelete<void>("/api/auth/totp", undefined, OPTS)
}

/** N28: 10 new codes in place of the old ones, shown once. */
export async function regenerateRecoveryCodes(): Promise<string[]> {
  const data = await apiPost<{ RecoveryCodes: string[] | null }>("/api/auth/recovery-codes", {}, undefined, OPTS)
  return data?.RecoveryCodes ?? []
}

/**
 * N29: confirm this session for 5 minutes. A passkey runs its own ceremony (the server asks for user verification);
 * the browser prompt throws a DOMException when it is closed (lib/passkey isPasskeyDismissed).
 */
export async function stepUp(method: ConfirmMethod, input: ConfirmInput = {}): Promise<void> {
  if (method === "passkey") {
    const ceremony = await apiPost<PasskeyCeremony>("/api/auth/step-up/passkey/begin", {}, undefined, OPTS)
    const Credential = await getPasskey(ceremony.Options)
    await apiPost("/api/auth/step-up", { Method: "passkey", CeremonyID: ceremony.CeremonyID, Credential }, undefined, OPTS)
    return
  }
  const body = method === "totp" ? { Method: "totp", Code: input.code ?? "" } : { Method: "password", Password: input.password ?? "" }
  await apiPost("/api/auth/step-up", body, undefined, OPTS)
}

/** Recovery-code sign-in: the password is always checked, the code stands in for the lost factor. */
export async function signInWithRecoveryCode(body: { Email: string; Password: string; Code: string; RecaptchaToken: string; Redirect?: string }): Promise<string> {
  const { RedirectURL } = await apiPost<{ RedirectURL: string }>("/api/auth/sign-in/recovery", body, undefined, OPTS)
  return RedirectURL
}
