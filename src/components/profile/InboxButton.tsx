"use client"

import { useCallback, useEffect, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import DOMPurify from "isomorphic-dompurify"
import { Bell, ChevronLeft, X } from "lucide-react"

import { apiGet, apiPatch } from "@/api/client"
import { t, locale } from "@/i18n/t"
import { onServiceRestored } from "@/lib/serviceStatus"

type Message = {
  ID: string
  Title: string
  Body: string
  Link: string
  ReadAt: string | null
  CreatedAt: string
}

function safeHref(value: string): string | null {
  const href = value.trim()
  if (href.startsWith("/") && !href.startsWith("//")) return href
  if (/^https?:\/\//i.test(href)) return href
  return null
}

function EmptyInbox() {
  return <div data-empty-state className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
    <span className="flex h-12 w-12 items-center justify-center">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-dim">
        <path d="M4.5 5.5h15L21.5 18a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2l2-12.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M3.5 14h4.7l1.5 2h4.6l1.5-2h4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
    <p className="text-sm text-dim">{t("inbox.empty")}</p>
  </div>
}

export function InboxButton() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Message[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = useCallback(() => {
    void apiGet<Message[]>("/api/notifications/inbox")
      .then((next) => {
        // An older refresh must not undo a successful read action.
        setItems((previous) => (next ?? []).map((item) => ({
          ...item,
          ReadAt: item.ReadAt ?? previous.find((entry) => entry.ID === item.ID)?.ReadAt ?? null,
        })))
        setError("")
      })
      .catch(() => setError(t("inbox.loadError")))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    refresh()
    const unsubscribe = onServiceRestored(refresh)
    const timer = window.setInterval(refreshWhenVisible, 15_000)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    window.addEventListener("focus", refreshWhenVisible)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.removeEventListener("focus", refreshWhenVisible)
    }
  }, [refresh])

  const unread = items.filter((item) => !item.ReadAt).length
  const active = items.find((item) => item.ID === selected)
  const label = unread ? `${t("inbox.title")}: ${unread} ${t("inbox.unread")}` : t("inbox.title")

  async function openMessage(item: Message) {
    setSelected(item.ID)
    setError("")
    if (item.ReadAt) return
    try {
      await apiPatch(`/api/notifications/inbox/${encodeURIComponent(item.ID)}/read`, {})
      setItems((current) => current.map((entry) => entry.ID === item.ID
        ? { ...entry, ReadAt: new Date().toISOString() }
        : entry))
    } catch {
      setError(t("inbox.readError"))
    }
  }

  async function readAll() {
    setError("")
    try {
      await apiPatch("/api/notifications/inbox/read-all", {})
      const now = new Date().toISOString()
      setItems((current) => current.map((item) => ({ ...item, ReadAt: item.ReadAt ?? now })))
    } catch {
      setError(t("inbox.readError"))
    }
  }

  return <Popover.Root open={open} onOpenChange={(next) => {
    setOpen(next)
    if (next) refresh()
    else setSelected(null)
  }}>
    <Popover.Trigger asChild>
      <button type="button" aria-label={label} className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-action">
        <Bell size={17} aria-hidden="true" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-action px-0.5 text-[10px] font-semibold leading-none text-on-action">{unread > 99 ? "99+" : unread}</span>}
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content align="end" sideOffset={20} collisionPadding={12} aria-label={t("inbox.title")} className="z-50 flex max-h-[min(38rem,calc(100vh-5rem))] w-[min(32rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-line bg-surface text-ink shadow-[var(--ib-shadow-overlay)] outline-none">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {active && <button type="button" onClick={() => setSelected(null)} aria-label={t("inbox.back")} className="rounded-md p-1 hover:bg-hover focus-visible:outline-2 focus-visible:outline-action"><ChevronLeft size={16} /></button>}
            {active ? <h2 className="truncate text-sm font-semibold">{active.Title}</h2> : <h2>
              <span className="sr-only">{t("inbox.title")}</span>
              <Bell size={19} aria-hidden="true" className="text-dim" />
            </h2>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!active && <button type="button" disabled={unread === 0} onClick={() => void readAll()} className="rounded-md px-2 py-1 text-xs font-medium text-action hover:bg-hover focus-visible:outline-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">{t("inbox.readAll")}</button>}
            <Popover.Close aria-label={t("inbox.close")} className="rounded-md p-1 text-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-action"><X size={16} /></Popover.Close>
          </div>
        </div>
        {error && <p role="alert" className="mx-3 mt-3 rounded-md bg-danger-bg p-2 text-xs text-danger">{error}</p>}
        {active ? <section className="min-h-0 overflow-y-auto p-4" aria-label={t("inbox.message")}>
          <time className="block text-xs text-dim" dateTime={active.CreatedAt}>{new Date(active.CreatedAt).toLocaleString(locale)}</time>
          <div className="mt-4 break-words text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(active.Body ?? "") }} />
          {safeHref(active.Link ?? "") && <a className="mt-4 inline-block text-sm font-medium text-action hover:underline" href={safeHref(active.Link ?? "")!}>{t("inbox.open")}</a>}
        </section> : <>
          <div className="min-h-0 overflow-y-auto">
            {loading ? <p className="p-4 text-sm text-dim">{t("common.loading")}</p> : items.length === 0 ? <EmptyInbox /> : <ul className="divide-y divide-line">{items.map((item) => <li key={item.ID}><button type="button" onClick={() => void openMessage(item)} className="flex w-full flex-col gap-1 px-4 py-3 text-left text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-action"><span className="flex w-full items-center gap-2"><span className={`min-w-0 flex-1 truncate ${item.ReadAt ? "" : "font-semibold"}`}>{item.Title}</span>{!item.ReadAt && <span aria-label={t("inbox.unreadItem")} className="h-2 w-2 shrink-0 rounded-full bg-action" />}</span><time className="text-xs text-dim" dateTime={item.CreatedAt}>{new Date(item.CreatedAt).toLocaleString(locale)}</time></button></li>)}</ul>}
          </div>
        </>}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
