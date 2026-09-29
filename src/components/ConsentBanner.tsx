"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"
import {
  ACCEPT_ALL,
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  POLICY_LINK_ATTRS,
  readConsent,
  saveConsent,
  shouldShowBanner,
  type ConsentPrefs,
} from "@/lib/consent"
import { mainOrigin } from "@/lib/origins"
import "@/styles/consent.css"

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
}
// A primitive snapshot: "none" = no choice yet; "ssr" = server render, cookie unknown (render nothing).
const snapshot = () => {
  const prefs = readConsent()
  return prefs ? (prefs.analytics ? "granted" : "denied") : "none"
}
const serverSnapshot = () => "ssr"

// The Cookie Policy lives on the main site.
const POLICY_HREF = `${mainOrigin === "/" ? "" : mainOrigin}/cookies`

// A message with a {link} placeholder, the policy link in its place (no tRich in this app).
function WithPolicyLink({ k }: { k: string }) {
  const [before, after = ""] = t(k).split("{link}")
  return (
    <>
      {before}
      {/* New tab; the click must not reach any outer handler, so the banner/panel and its toggles stay. */}
      <a href={POLICY_HREF} {...POLICY_LINK_ATTRS} aria-label={t("consent.policyLinkNewTab")} onClick={(e) => e.stopPropagation()}>
        {t("consent.policyLink")}
      </a>
      {after}
    </>
  )
}

// Cookie consent in two layers, fixed to the bottom, non-blocking.
// 1. Banner: a general line, «Налаштувати» and «Прийняти всі».
// 2. Panel: categories (Необхідні — always on; Аналітика — off by default),
//    «Зберегти вибір» and «Прийняти всі».
// Shown when GA is configured and no choice exists; «Налаштування файлів cookie» opens the panel.
// Esc never counts as consent: it steps back from the panel, or closes a panel opened from settings.
export function ConsentBanner({ gaId }: { gaId?: string }) {
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  // null = follow the stored choice; "panel" = preferences open.
  const [layer, setLayer] = useState<"banner" | "panel" | null>(null)
  const [analytics, setAnalytics] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const returnToRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onOpen = () => {
      returnToRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setAnalytics(readConsent()?.analytics ?? false)
      setLayer("panel")
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  // The panel was opened on request: move focus into it. Shown on load: leave focus where it is.
  useEffect(() => {
    if (layer === "panel") rootRef.current?.focus()
  }, [layer])

  const close = () => {
    setLayer(null)
    returnToRef.current?.focus()
    returnToRef.current = null
  }
  const choose = (prefs: ConsentPrefs) => {
    saveConsent(prefs)
    close()
  }

  if (stored === "ssr") return null
  const asking = shouldShowBanner(gaId, stored === "none" ? null : { analytics: stored === "granted" })
  const shown = layer ?? (asking ? "banner" : null)
  if (!shown) return null

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || shown !== "panel") return
    if (asking) setLayer("banner")
    else close()
  }

  if (shown === "banner") {
    return (
      <div ref={rootRef} className="cb-consent" role="region" aria-label={t("consent.label")} tabIndex={-1}>
        <p className="cb-consent__text">
          <WithPolicyLink k="consent.text" />
        </p>
        <div className="cb-consent__actions">
          <Button variant="secondary" size="sm" onClick={() => setLayer("panel")}>{t("consent.customize")}</Button>
          <Button size="sm" onClick={() => choose(ACCEPT_ALL)}>{t("consent.acceptAll")}</Button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="cb-consent cb-consent--panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cb-consent-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <p id="cb-consent-title" className="cb-consent__title">{t("consent.panelTitle")}</p>
      <ul className="cb-consent__cats">
        <li>
          <label className="cb-consent__cat">
            <span>
              <span className="cb-consent__name">{t("consent.necessary.title")}</span>
              <span className="cb-consent__desc">{t("consent.necessary.text")}</span>
            </span>
            <input type="checkbox" role="switch" className="cb-switch" checked disabled aria-label={t("consent.necessary.switch")} />
          </label>
        </li>
        <li>
          <label className="cb-consent__cat">
            <span>
              <span className="cb-consent__name">{t("consent.analytics.title")}</span>
              <span className="cb-consent__desc">{t("consent.analytics.text")}</span>
            </span>
            <input type="checkbox" role="switch" className="cb-switch" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
          </label>
        </li>
      </ul>
      <p className="cb-consent__policy">
        <WithPolicyLink k="consent.policy" />
      </p>
      <div className="cb-consent__actions cb-consent__actions--panel">
        <Button variant="secondary" size="sm" onClick={() => choose({ analytics })}>{t("consent.saveChoice")}</Button>
        <Button size="sm" onClick={() => choose(ACCEPT_ALL)}>{t("consent.acceptAll")}</Button>
      </div>
    </div>
  )
}
