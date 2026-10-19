"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CheckCircle2, CircleAlert, TriangleAlert, X } from "lucide-react"
import { t } from "@/i18n/t"

type Tone = "success" | "warning" | "error"
/** A button in the toast; clicking it runs `onClick` and closes the toast. */
export type ToastAction = { label: string; onClick: () => void }
export type ToastOptions = { action?: ToastAction }
type Toast = { id: number; message: string; tone: Tone; action?: ToastAction }
let nextToastId = 0
const listeners = new Set<(item: Toast) => void>()

function show(tone: Tone, message: string, options?: ToastOptions) {
  const item = { id: ++nextToastId, message, tone, action: options?.action }
  listeners.forEach((listener) => listener(item))
}

export const toast = {
  success: (message: string, options?: ToastOptions) => show("success", message, options),
  warning: (message: string, options?: ToastOptions) => show("warning", message, options),
  error: (message: string, options?: ToastOptions) => show("error", message, options),
}

const toneStyle: Record<Tone, string> = {
  success: "border-[var(--ib-ok)] bg-[var(--ib-ok-bg)] text-ink",
  warning: "border-[var(--ib-warn)] bg-[var(--ib-warn-bg)] text-ink",
  error: "border-danger bg-danger-bg text-ink",
}
const iconStyle: Record<Tone, string> = {
  success: "text-ok",
  warning: "text-warn",
  error: "text-danger",
}

const TOAST_MS = 5000

// One toast with its own timer; hovering or focusing it holds the timer (WCAG 2.2.1), leaving starts it again.
function ToastCard({ item, onDismiss }: { item: Toast; onDismiss: (id: number) => void }) {
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (held) return
    const timer = window.setTimeout(() => onDismiss(item.id), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [held, item.id, onDismiss])

  return <div role={item.tone === "success" ? "status" : "alert"} data-tone={item.tone}
    onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}
    className={`pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${toneStyle[item.tone]}`}>
    {item.tone === "success" ? <CheckCircle2 aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconStyle[item.tone]}`} />
      : item.tone === "warning" ? <TriangleAlert aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconStyle[item.tone]}`} />
        : <CircleAlert aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconStyle[item.tone]}`} />}
    <span className="min-w-0 flex-1">{item.message}</span>
    {item.action && <button type="button" onClick={() => { onDismiss(item.id); item.action?.onClick() }}
      className="shrink-0 rounded font-medium text-ink underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-primary">
      {item.action.label}
    </button>}
    <button type="button" aria-label={t("toast.dismiss", { message: item.message })} onClick={() => onDismiss(item.id)}
      className="rounded p-0.5 text-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
      <X aria-hidden="true" className="h-4 w-4" />
    </button>
  </div>
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])

  useEffect(() => {
    const receive = (item: Toast) => setItems((current) => [...current.slice(-3), item])
    listeners.add(receive)
    return () => { listeners.delete(receive) }
  }, [])

  return <>
    {children}
    <div role="region" className="pointer-events-none fixed left-1/2 top-4 z-[var(--z-toast)] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2" aria-label={t("toast.region")}>
      {items.map((item) => <ToastCard key={item.id} item={item} onDismiss={dismiss} />)}
    </div>
  </>
}
