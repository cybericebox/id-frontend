// Every browser-storage key (localStorage, sessionStorage, cookies) of this app lives here and starts with `cib_`.
// Keys with a scope are built by a function; the scope goes in after an underscore.

export const STORAGE_INBOX_READ = "cib_inbox_read"
export const STORAGE_BACK = "cib_back"
// Profile drafts of one account (the scope is the user id), so another user in the same tab never gets them.
export const ACCOUNT_DRAFT_PREFIXES = ["cib_draft_account_email", "cib_draft_profile_name"] as const
const SITE_BANNER_DISMISSED = "cib_site_banner_dismissed"
const SETUP_DRAFT = "cib_setup_draft"

export function siteBannerDismissedKey(id: string | number, version: string | number = ""): string {
  return `${SITE_BANNER_DISMISSED}_${id}_${version}`
}

export function accountEmailDraftKey(userId: string): string {
  return `${ACCOUNT_DRAFT_PREFIXES[0]}_${userId}`
}

export function profileNameDraftKey(userId: string): string {
  return `${ACCOUNT_DRAFT_PREFIXES[1]}_${userId}`
}

// A one-time token read from the address (reset, setup, email change), kept for the tab once the address drops it.
export function urlTokenKey(pathname: string): string {
  return `cib_url_token_${pathname}`
}

export function setupDraftKey(token: string): string {
  return `${SETUP_DRAFT}_${token}`
}
export const COOKIE_RETURN_TO = "cib_return_to"

export const COOKIE_SIGNED_IN = "cib_signed_in"
// Functional category (conveniences): written only with functional consent, removed when it is withdrawn.
export const FUNCTIONAL_STORAGE = {
  local: [STORAGE_INBOX_READ],
  localPrefixes: [] as string[],
  session: [STORAGE_BACK],
  sessionPrefixes: [...ACCOUNT_DRAFT_PREFIXES, SETUP_DRAFT] as string[],
  cookies: [COOKIE_SIGNED_IN],
} as const
