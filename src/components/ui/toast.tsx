"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CheckCircle2, CircleAlert, TriangleAlert, X } from "lucide-react"
import { t } from "@/i18n/t"

type Tone = "success" | "warning" | "error"
type Toast = { id: number; message: string; tone: Tone }
let nextToastId = 0
const listeners = new Set<(item: Toast) => void>()

export const toast = {
  success: (message: string) => { const item = { id: ++nextToastId, message, tone: "success" as const }; listeners.forEach((listener) => listener(item)) },
  warning: (message: string) => { const item = { id: ++nextToastId, message, tone: "warning" as const }; listeners.forEach((listener) => listener(item)) },
  error: (message: string) => { const item = { id: ++nextToastId, message, tone: "error" as const }; listeners.forEach((listener) => listener(item)) },
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])

  useEffect(() => {
    const receive = (item: Toast) => setItems((current) => [...current.slice(-3), item])
    listeners.add(receive)
    return () => { listeners.delete(receive) }
  }, [])

  useEffect(() => {
    if (items.length === 0) return
    const timer = window.setTimeout(() => dismiss(items[0].id), 5000)
    return () => window.clearTimeout(timer)
  }, [items, dismiss])

  return <>
    {children}
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2" aria-label={t("toast.region")}>
      {items.map((item) => <div key={item.id} role={item.tone === "success" ? "status" : "alert"} data-tone={item.tone}
        className={`pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${toneStyle[item.tone]}`}>
        {item.tone === "success" ? <CheckCircle2 aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconStyle[item.tone]}`} />
          : item.tone === "warning" ? <TriangleAlert aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconStyle[item.tone]}`} />
            : <CircleAlert aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconStyle[item.tone]}`} />}
        <span className="min-w-0 flex-1">{item.message}</span>
        <button type="button" aria-label={t("toast.dismiss", { message: item.message })} onClick={() => dismiss(item.id)}
          className="rounded p-0.5 text-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>)}
    </div>
  </>
}
