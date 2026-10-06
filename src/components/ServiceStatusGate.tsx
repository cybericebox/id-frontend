"use client"

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react"

import { CREST_SRC } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"
import { apiOrigin } from "@/lib/origins"
import { getServiceStatus, probeService, reportServiceAvailable, startOutageGrace, subscribeServiceStatus } from "@/lib/serviceStatus"
import "@/components/ui/service-down.css"

// A failed call is confirmed by two probes 15 s apart (see startOutageGrace), so
// a short backend restart never flashes the overlay.
// Seconds between automatic tries while the outage lasts.
const BACKOFF_S = [3, 5, 10, 20, 30]

function backoff(attempt: number): number {
  return BACKOFF_S[Math.min(attempt, BACKOFF_S.length - 1)] * 1000
}

// The page behind: every other child of <body> is dimmed and inert while the overlay shows.
function useBehind(overlay: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const own = overlay.current
    const opener = document.activeElement as HTMLElement | null
    const behind = Array.from(document.body.children).filter((el) => el !== own && el.tagName !== "SCRIPT")
    for (const el of behind) {
      el.classList.add("ib-service-down-behind")
      el.setAttribute("inert", "")
      el.setAttribute("aria-hidden", "true")
    }
    return () => {
      for (const el of behind) {
        el.classList.remove("ib-service-down-behind")
        el.removeAttribute("inert")
        el.removeAttribute("aria-hidden")
      }
      opener?.focus?.()
    }
  }, [overlay])
}

function ServiceDown({ onCheck }: { onCheck: () => Promise<void> }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const textId = useId()
  const attemptRef = useRef(0)
  const [deadline, setDeadline] = useState(() => Date.now() + backoff(0))
  const [now, setNow] = useState(() => Date.now())
  const [checking, setChecking] = useState(false)
  const checkingRef = useRef(false)

  useBehind(overlayRef)

  const check = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true
    setChecking(true)
    try {
      await onCheck()
    } finally {
      attemptRef.current += 1
      checkingRef.current = false
      setChecking(false)
      const at = Date.now()
      setNow(at)
      setDeadline(at + backoff(attemptRef.current))
    }
  }, [onCheck])

  useEffect(() => {
    buttonRef.current?.focus()
    // not dismissable: Esc does nothing, Tab stays on the card's only control
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
      } else if (event.key === "Tab") {
        event.preventDefault()
        ;(buttonRef.current ?? cardRef.current)?.focus()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [])

  useEffect(() => {
    if (checking) return
    const id = window.setInterval(() => {
      const at = Date.now()
      setNow(at)
      if (at >= deadline) void check()
    }, 1000)
    return () => window.clearInterval(id)
  }, [checking, deadline, check])

  const seconds = Math.max(1, Math.ceil((deadline - now) / 1000))
  return <div ref={overlayRef} className="ib-service-down">
    <div ref={cardRef} className="ib-service-down__card" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} tabIndex={-1}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ib-service-down__crest" src={CREST_SRC} alt="" width={36} height={35} />
      <h2 className="ib-service-down__title" id={titleId}>{t("serviceGate.title")}</h2>
      <p className="ib-service-down__text" id={textId}>{t("serviceGate.body")}</p>
      <p className="ib-service-down__status">{checking ? t("serviceGate.checking") : t("serviceGate.nextTry", { seconds })}</p>
      {/* the countdown changes every second and stays silent; only the check itself is announced */}
      <span className="sr-only" role="status">{checking ? t("serviceGate.checking") : ""}</span>
      <Button ref={buttonRef} type="button" variant="outline" className="w-full" busy={checking} onClick={() => { void check() }}>{t("serviceGate.retryNow")}</Button>
    </div>
  </div>
}

/**
 * App-wide «server unavailable» overlay (DS patterns/service-down), the same as the event
 * site's. API calls report network failures and 5xx into the status store; two probes 15 s
 * apart confirm before the overlay shows. The page stays rendered, dimmed and inert behind
 * it; it cannot be dismissed, retries on a 3/5/10/20/30 s backoff or on «Спробувати зараз»,
 * and closes by itself once the API answers.
 */
export function ServiceStatusGate() {
  const status = useSyncExternalStore(subscribeServiceStatus, getServiceStatus, () => "up" as const)

  useEffect(() => {
    if (status !== "suspect") return
    return startOutageGrace(() => probeService(apiOrigin))
  }, [status])

  const onCheck = useCallback(async () => {
    if (!await probeService(apiOrigin)) return
    // Screens refetch what failed through onServiceRestored.
    reportServiceAvailable()
  }, [])

  if (status !== "down") return null
  return <ServiceDown onCheck={onCheck} />
}
