import { ACCOUNT_DRAFT_PREFIXES } from "@/lib/storageKeys"

/**
 * Drops the profile drafts (sessionStorage) of every account except `keepUserId`; without it, of all accounts (sign-out).
 * Called once the signed-in account is known, so a draft left by another user in this tab is never restored.
 */
export function clearAccountDrafts(keepUserId?: string): void {
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i) ?? "")
    for (const key of keys) {
      const prefix = ACCOUNT_DRAFT_PREFIXES.find((p) => key.startsWith(`${p}_`))
      if (prefix && (keepUserId === undefined || key !== `${prefix}_${keepUserId}`)) sessionStorage.removeItem(key)
    }
  } catch {
    /* storage may be unavailable */
  }
}
