/**
 * WebAuthn through the browser's JSON API (PublicKeyCredential.parse*OptionsFromJSON / credential.toJSON()), the same
 * shapes the daemon speaks: Options is {"publicKey": ...}, Credential is the toJSON() form.
 */

export type PasskeyCeremony = { CeremonyID: string; Options: { publicKey: unknown } }

type JsonCredential = { toJSON(): unknown }
type PublicKeyCredentialStatics = {
  parseCreationOptionsFromJSON(json: unknown): CredentialCreationOptions["publicKey"]
  parseRequestOptionsFromJSON(json: unknown): CredentialRequestOptions["publicKey"]
  isConditionalMediationAvailable?: () => Promise<boolean>
}

function statics(): PublicKeyCredentialStatics | null {
  if (typeof window === "undefined" || typeof PublicKeyCredential === "undefined") return null
  const api = PublicKeyCredential as unknown as Partial<PublicKeyCredentialStatics>
  return api.parseCreationOptionsFromJSON && api.parseRequestOptionsFromJSON ? (api as PublicKeyCredentialStatics) : null
}

/** The browser can create and use passkeys through the JSON API. */
export function passkeysSupported(): boolean {
  return statics() !== null && Boolean(navigator.credentials)
}

/** The browser can offer saved passkeys in the autofill of a field marked autocomplete="… webauthn". */
export async function conditionalPasskeysAvailable(): Promise<boolean> {
  const api = statics()
  if (!api?.isConditionalMediationAvailable) return false
  try { return await api.isConditionalMediationAvailable() } catch { return false }
}

/** The person closed the browser's prompt or the ceremony was replaced: not an error to show. */
export function isPasskeyDismissed(err: unknown): boolean {
  return err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "AbortError")
}

export async function createPasskey(options: PasskeyCeremony["Options"]): Promise<unknown> {
  const api = statics()
  if (!api) throw new Error("passkeys are not supported")
  const credential = await navigator.credentials.create({ publicKey: api.parseCreationOptionsFromJSON(options.publicKey) })
  if (!credential) throw new DOMException("no credential", "NotAllowedError")
  return (credential as unknown as JsonCredential).toJSON()
}

export async function getPasskey(options: PasskeyCeremony["Options"], opts: { conditional?: boolean; signal?: AbortSignal } = {}): Promise<unknown> {
  const api = statics()
  if (!api) throw new Error("passkeys are not supported")
  const credential = await navigator.credentials.get({
    publicKey: api.parseRequestOptionsFromJSON(options.publicKey),
    ...(opts.conditional ? { mediation: "conditional" as CredentialMediationRequirement } : {}),
    signal: opts.signal,
  })
  if (!credential) throw new DOMException("no credential", "NotAllowedError")
  return (credential as unknown as JsonCredential).toJSON()
}
