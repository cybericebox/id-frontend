"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import * as Popover from "@radix-ui/react-popover"
import { X } from "lucide-react"
import { apiGet, apiPatch } from "@/api/client"
import { t } from "@/i18n/t"
import { Tooltip } from "@/components/ui/tooltip"
import { bannerHref, bannerLevel, dismissKey, hasBanners, isDismissed, parseBanners, rememberDismissed, type SiteBanner } from "@/lib/siteBanners"
import { PULSE_SITE, scopeQuery, subscribePulse } from "@/lib/pulse"
import "@/styles/site-banner.css"
import { keepBrand } from "@/i18n/brand"

type BannerRowProps = { banner: SiteBanner; onDismiss?: (banner: SiteBanner) => void; children?: ReactNode }

function BannerRow({ banner, onDismiss, children }: BannerRowProps) {
  const href = bannerHref(banner.LinkURL)
  return (
    <div className={`ib-site-banner ib-site-banner--${bannerLevel(banner.Level)}`}>
      <p className="ib-site-banner__text">
        {keepBrand(banner.Text)}
        {href ? <a className="ib-site-banner__link" href={href}>{keepBrand(banner.LinkLabel || t("siteBanner.more"))}</a> : null}
      </p>
      {children}
      {banner.Dismissible ? (<Tooltip content={t("siteBanner.dismiss")} side="bottom" align="end"><button type="button" className="ib-site-banner__x" aria-label={t("siteBanner.dismiss")} onClick={() => onDismiss?.(banner)}>
          <X aria-hidden="true" />
        </button></Tooltip>) : null}
    </div>
  )
}

// The API order is authoritative. Only the first announcement occupies the page header.
export function SiteBannerList({ banners, onDismiss }: { banners: SiteBanner[]; onDismiss?: (banner: SiteBanner) => void }) {
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  if (banners.length === 0) return null
  const [primary, ...others] = banners
  const plural = new Intl.PluralRules("uk").select(others.length)
  return (
    <div role="status" aria-label={t("siteBanner.label")} className="ib-site-banners">
      <Popover.Root modal={false}>
        <BannerRow banner={primary} onDismiss={onDismiss}>
          {others.length > 0 ? (
            <Popover.Trigger asChild>
              <button type="button" className="ib-site-banner__more">{t(`siteBanner.moreAnnouncements.${plural}`, { count: others.length })}</button>
            </Popover.Trigger>
          ) : null}
        </BannerRow>
        {others.length > 0 ? (
          <Popover.Portal>
            <Popover.Content className="ib-site-banner-panel" side="bottom" align="end" sideOffset={8} collisionPadding={16} aria-labelledby={titleId} onOpenAutoFocus={(event) => { event.preventDefault(); titleRef.current?.focus() }}>
              <h2 ref={titleRef} id={titleId} tabIndex={-1} className="ib-site-banner-panel__title">{t("siteBanner.others")}</h2>
              {others.map((banner) => <BannerRow key={dismissKey(banner)} banner={banner} onDismiss={onDismiss} />)}
            </Popover.Content>
          </Popover.Portal>
        ) : null}
      </Popover.Root>
    </div>
  )
}

// The list last fetched in this tab and the pulse version it stands for: a remount (another layout) reuses it.
let held: { version: string; banners: SiteBanner[] } | null = null

/** Test helper: forget the held list, as on a fresh page load. */
export function forgetHeldBanners(): void { held = null }

// Site banners: GET /api/notifications/banners, fetched once on load and then only when the shared pulse
// reports a new Banners version; never for a version of an empty list. A banner outage never blocks the page:
// errors are ignored and nothing renders until data arrives.
export function SiteBanners() {
  const [banners, setBanners] = useState<SiteBanner[]>(() => held?.banners ?? [])
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    let active = true
    let wanted: string | null = null
    let busy = false
    const scope = { site: PULSE_SITE }
    const load = async () => {
      if (busy) return
      busy = true
      try {
        while (active && wanted !== null && wanted !== held?.version) {
          const target = wanted
          // No banners at all: nothing to ask, the list is simply empty.
          if (!hasBanners(target)) { held = { version: target, banners: [] }; setBanners([]); continue }
          try {
            const data = await apiGet<unknown>(`/api/notifications/banners${scopeQuery(scope)}`, undefined, { required: false })
            const list = parseBanners(data)
            held = { version: target, banners: list }
            if (!active) return
            setBanners(list)
          } catch {
            return // retried on the next pulse
          }
        }
      } finally {
        busy = false
      }
    }
    const unsubscribe = subscribePulse(scope, (pulse) => { wanted = pulse.Banners; void load() })
    return () => { active = false; unsubscribe() }
  }, [])

  const visible = banners.filter((banner) => !dismissed.has(dismissKey(banner)) && (banner.Kind === "personal" || !isDismissed(banner)))
  const dismiss = (banner: SiteBanner) => {
    const hide = () => setDismissed((current) => new Set(current).add(dismissKey(banner)))
    if (banner.Kind === "personal") {
      hide()
      void apiPatch(`/api/notifications/banners/${encodeURIComponent(banner.ID)}/dismiss`, {}, undefined, { required: false }).catch(() => { /* it returns with the next banner list */ })
      return
    }
    rememberDismissed(banner)
    hide()
  }
  return <SiteBannerList banners={visible} onDismiss={dismiss} />
}
