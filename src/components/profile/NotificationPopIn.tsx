"use client"

/* eslint-disable @eslint-react/dom-no-dangerously-set-innerhtml -- Notification HTML is sanitized with DOMPurify at each insertion point. */

import { useEffect, useRef, useState } from "react"
import DOMPurify from "isomorphic-dompurify"
import { X } from "lucide-react"
import { t } from "@/i18n/t"
import { NotificationMessageCard, notificationAccent } from "./NotificationMessageCard"

export type PopInMessage = {
  ID: string
  Title: string
  Body: string
  Icon?: string
  Tone?: string
  AccentColor?: string
  AutoDismissMs?: number | null
  Actions?: { label: string; href: string }[] | null
}

export function popInDuration(value: number | null | undefined): number {
  return value == null ? 5000 : Math.min(10000, Math.max(3000, value))
}

function safeHref(value: string): boolean {
  const href = value.trim()
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#") || /^https?:\/\/|^mailto:/i.test(href)
}

export function NotificationPopIn({ message, onClose, onAction }: {
  message: PopInMessage
  onClose: () => void
  onAction: (href: string) => void
}) {
  const duration = popInDuration(message.AutoDismissMs)
  const accent = notificationAccent(message.Tone, message.AccentColor)
  const action = message.Actions?.find((item) => item.label && safeHref(item.href ?? ""))
  const remainingRef = useRef(duration)
  const closeRef = useRef(onClose)
  const [paused, setPaused] = useState(false)

  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const timer = window.setTimeout(() => closeRef.current(), remainingRef.current)
    return () => {
      window.clearTimeout(timer)
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - started))
    }
  }, [paused, message.ID])

  return <div role="status" aria-label={t("inbox.new")} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false) }} className="relative w-[min(22.5rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-surface px-4 pb-5 pt-4 text-ink">
    <button type="button" onClick={onClose} aria-label={t("inbox.dismiss")} className="absolute right-2 top-2 rounded-md p-1 text-dim hover:bg-hover hover:text-ink"><X size={16} /></button>
    <div className="pr-5">
      <NotificationMessageCard
        icon={message.Icon} tone={message.Tone} accentColor={message.AccentColor} title={message.Title}
        body={message.Body && <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.Body) }} />}
        actions={action && <button type="button" onClick={() => onAction(action.href)} className="text-sm font-medium text-action hover:underline">{action.label}</button>}
      />
    </div>
    <span aria-hidden="true" className="absolute bottom-2 left-4 right-4 h-1 overflow-hidden rounded-full bg-soft">
      <span className="block h-full w-full origin-left" style={{ backgroundColor: accent, animationName: "notification-countdown", animationDuration: `${duration}ms`, animationTimingFunction: "linear", animationFillMode: "forwards", animationPlayState: paused ? "paused" : "running" }} />
    </span>
  </div>
}
