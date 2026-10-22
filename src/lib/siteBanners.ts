import { siteBannerDismissedKey } from "@/lib/storageKeys"
// Site banners (docs/BROADCASTS.md, «Банери»): pure model shared in spirit by every frontend.
// GET /api/notifications/banners is refetched only when the pulse reports a new Banners version; the server
// already filters by activity, window and audience. Personal banners are dismissed on the server.
// Dismissal lives in the browser only, under `${ID}:${Version}` (an edited banner gets a new Version).

export type BannerLevel = "info" | "warning" | "critical"

export type BannerKind = "site" | "system" | "personal"

export type SiteBanner = {
  ID: string
  Kind?: BannerKind
  Title?: string
  Text: string
  LinkURL?: string
  LinkLabel?: string
  Level?: string
  Dismissible?: boolean
  Version?: string | number
}

/** The pulse Banners version of an empty list (the first 16 hex of sha256 of nothing); a newer backend may send "". */
export const EMPTY_BANNERS_VERSION = "e3b0c44298fc1c14"

/** Whether a pulse Banners version stands for a non-empty list: only then is the list worth a request. */
export function hasBanners(version: string): boolean {
  return version !== "" && version !== EMPTY_BANNERS_VERSION
}

const SEVERITY: Record<BannerLevel, number> = { critical: 0, warning: 1, info: 2 }

type StorageLike = Pick<Storage, "getItem" | "setItem">

export function bannerLevel(level: string | undefined): BannerLevel {
  return level === "critical" || level === "warning" ? level : "info"
}

/** Only in-app paths and http(s) links are rendered; javascript:, data:, protocol-relative etc. are dropped. */
export function bannerHref(url: string | undefined): string | null {
  const value = (url ?? "").trim()
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value
  if (/^https?:\/\//i.test(value)) return value
  return null
}

/** Most severe first; the server order is kept within one level. */
export function sortBanners(items: readonly SiteBanner[]): SiteBanner[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => SEVERITY[bannerLevel(a.item.Level)] - SEVERITY[bannerLevel(b.item.Level)] || a.index - b.index)
    .map(({ item }) => item)
}

export function dismissKey(banner: Pick<SiteBanner, "ID" | "Version">): string {
  return siteBannerDismissedKey(banner.ID, banner.Version ?? "")
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

export function isDismissed(banner: SiteBanner, storage: StorageLike | null = browserStorage()): boolean {
  if (!banner.Dismissible || !storage) return false
  try {
    return storage.getItem(dismissKey(banner)) === "1"
  } catch {
    return false
  }
}

export function rememberDismissed(banner: SiteBanner, storage: StorageLike | null = browserStorage()): void {
  if (!storage) return
  try {
    storage.setItem(dismissKey(banner), "1")
  } catch {
    // the banner stays hidden for this page view only
  }
}

/** Tolerant parse of the response: anything that is not a list of banners with text yields nothing.
 *  A personal banner may carry only a Title: it is shown as the text. */
export function parseBanners(data: unknown): SiteBanner[] {
  if (!Array.isArray(data)) return []
  const out: SiteBanner[] = []
  for (const item of data) {
    if (!item || typeof item !== "object" || typeof item.ID !== "string") continue
    const text = typeof item.Text === "string" ? item.Text : ""
    const title = typeof item.Title === "string" ? item.Title : ""
    if (text !== "") out.push(item as SiteBanner)
    else if (item.Kind === "personal" && title !== "") out.push({ ...item, Text: title } as SiteBanner)
  }
  return out
}
