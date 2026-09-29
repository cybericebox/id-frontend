"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"
import { CONSENT_CHANGE_EVENT, CONSENT_OPEN_EVENT, readConsent, saveConsent, shouldShowBanner, type ConsentChoice } from "@/lib/consent"
import { mainOrigin } from "@/lib/origins"
import "@/styles/consent.css"

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
}
// "none" = no choice yet; "ssr" = server render, where the cookie is unknown (render nothing).
const snapshot = () => readConsent() ?? "none"
const serverSnapshot = () => "ssr"

// The Cookie Policy lives on the main site.
const POLICY_HREF = `${mainOrigin === "/" ? "" : mainOrigin}/cookies`

// Analytics consent banner: non-blocking, bottom of the page, two equal buttons.
// Shown when GA is configured and no choice exists, or when «Налаштування cookie»
// reopens it. Esc closes a reopened banner without changing the choice; it never
// counts as consent.
export function ConsentBanner({ gaId }: { gaId: string }) {
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const [reopened, setReopened] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const returnToRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onOpen = () => {
      returnToRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setReopened(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  // Opened on request: move focus into the banner. Shown on load: leave focus where it is.
  useEffect(() => {
    if (reopened) panelRef.current?.focus()
  }, [reopened])

  const close = () => {
    setReopened(false)
    returnToRef.current?.focus()
    returnToRef.current = null
  }
  const choose = (choice: ConsentChoice) => {
    saveConsent(choice)
    close()
  }

  const visible = stored !== "ssr" && (reopened || shouldShowBanner(gaId, stored === "none" ? null : (stored as ConsentChoice)))
  if (!visible) return null
  // consent.text carries a {link} placeholder for the policy link (no tRich in this app).
  const [textBefore, textAfter = ""] = t("consent.text").split("{link}")

  return (
    <div
      ref={panelRef}
      className="cb-consent"
      role="region"
      aria-labelledby="cb-consent-title"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape" && reopened && stored !== "none") close()
      }}
    >
      <div className="cb-consent__text">
        <p id="cb-consent-title" className="cb-consent__title">{t("consent.title")}</p>
        <p>
          {textBefore}
          <a href={POLICY_HREF}>{t("consent.policyLink")}</a>
          {textAfter}
        </p>
      </div>
      <div className="cb-consent__actions">
        <Button variant="secondary" size="sm" onClick={() => choose("denied")}>{t("consent.reject")}</Button>
        <Button variant="secondary" size="sm" onClick={() => choose("granted")}>{t("consent.accept")}</Button>
      </div>
    </div>
  )
}
