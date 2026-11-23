import type { ConfirmMethod, SecondFactorStatus, StepUpMethod } from "@/api/secondFactor"

// Methods that may confirm a change of the factors of an account that has one (backend Method.ConfirmsFactorChange).
const FACTOR_CHANGE: readonly StepUpMethod[] = ["passkey", "totp", "recovery-code"]

/** The session holds a fresh step-up that confirms a factor change: no confirmation needs to be asked for. */
export function factorStepUpFresh(status: SecondFactorStatus | null, now = Date.now()): boolean {
  if (!status?.StepUpMethod || !status.StepUpExpiresAt || !FACTOR_CHANGE.includes(status.StepUpMethod)) return false
  return Date.parse(status.StepUpExpiresAt) > now
}

/**
 * How this person can confirm: their factors (the authenticator first, then a passkey the browser can use), or the
 * password when the account has no second factor. Empty when the only factor is a passkey this browser cannot use.
 */
export function confirmMethods(status: SecondFactorStatus, passkeysUsable: boolean): ConfirmMethod[] {
  if (!status.HasSecondFactor) return ["password"]
  const out: ConfirmMethod[] = []
  if (status.TOTPEnabled) out.push("totp")
  if (status.Passkeys > 0 && passkeysUsable) out.push("passkey")
  return out
}

export const TOTP_DIGITS = 6

/** An authenticator code as typed or pasted: digits only, at most six. */
export function cleanTotpCode(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, TOTP_DIGITS)
}

/** The text of the downloaded or copied codes: the heading lines, a blank line, one code a line. */
export function recoveryCodesText(codes: readonly string[], heading: readonly string[]): string {
  return [...heading, "", ...codes].join("\n") + "\n"
}

/** The step-up page for a page to come back to. */
export function stepUpHref(returnTo: string): string {
  return `/step-up/?return_to=${encodeURIComponent(returnTo)}`
}

/** A base32 secret in groups of four, easier to type into an app. */
export function groupSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ")
}
