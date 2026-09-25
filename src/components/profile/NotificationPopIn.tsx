"use client"

/* eslint-disable @eslint-react/dom-no-dangerously-set-innerhtml -- Notification HTML is sanitized with DOMPurify at each insertion point. */

import { useEffect, useRef, useState } from "react"
import DOMPurify from "isomorphic-dompurify"
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, CircleHelp, Info, Mail, ShieldCheck, Trophy, UserRound, X, XCircle } from "lucide-react"
import type { ComponentType } from "react"
import type { LucideProps } from "lucide-react"
import { t } from "@/i18n/t"

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

const icons: Record<string, ComponentType<LucideProps>> = {
  info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle,
  bell: Bell, mail: Mail, calendar: CalendarDays, user: UserRound,
  shield: ShieldCheck, trophy: Trophy, help: CircleHelp,
}
const tones: Record<string, string> = {
  neutral: "#64748B", info: "#0091EA", success: "#16A34A",
  warning: "#D97706", danger: "#DC2626",
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
  const accent = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(message.AccentColor ?? "")
    ? message.AccentColor! : tones[message.Tone ?? "neutral"] ?? tones.neutral
  const Icon = icons[message.Icon ?? "bell"] ?? Bell
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

  return <div role="status" aria-label={t("inbox.new")} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false) }} className="relative w-[min(22.5rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-surface px-4 pb-5 pt-4 text-ink shadow-[var(--ib-shadow-overlay)]">
    <button type="button" onClick={onClose} aria-label={t("inbox.dismiss")} className="absolute right-2 top-2 rounded-md p-1 text-dim hover:bg-hover hover:text-ink"><X size={16} /></button>
    <div className="flex min-w-0 items-start gap-3 pr-5">
      <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md" style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--ib-surface))` }}><Icon size={20} strokeWidth={1.8} /></span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold leading-snug">{message.Title}</p>
        {message.Body && <div className="mt-1 break-words text-sm leading-relaxed text-dim" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.Body) }} />}
        {action && <button type="button" onClick={() => onAction(action.href)} className="mt-3 text-sm font-medium text-action hover:underline">{action.label}</button>}
      </div>
    </div>
    <span aria-hidden="true" className="absolute bottom-2 left-4 right-4 h-1 overflow-hidden rounded-full bg-soft">
      <span className="block h-full w-full origin-left" style={{ backgroundColor: accent, animationName: "notification-countdown", animationDuration: `${duration}ms`, animationTimingFunction: "linear", animationFillMode: "forwards", animationPlayState: paused ? "paused" : "running" }} />
    </span>
  </div>
}
