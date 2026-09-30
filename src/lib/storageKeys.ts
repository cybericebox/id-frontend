// Every browser-storage key (localStorage, sessionStorage, cookies) of this app lives here and starts with `cib_`.
// Keys with a scope are built by a function; the scope goes in after an underscore.

export const STORAGE_INBOX_READ = "cib_inbox_read"
export const STORAGE_BACK = "cib_back"
export const STORAGE_DRAFT_ACCOUNT_EMAIL = "cib_draft_account_email"
export const STORAGE_DRAFT_PROFILE_NAME = "cib_draft_profile_name"
const SITE_BANNER_DISMISSED = "cib_site_banner_dismissed"
const SETUP_DRAFT = "cib_setup_draft"

export function siteBannerDismissedKey(id: string | number, version: string | number = ""): string {
  return `${SITE_BANNER_DISMISSED}_${id}_${version}`
}

export function setupDraftKey(token: string): string {
  return `${SETUP_DRAFT}_${token}`
}
