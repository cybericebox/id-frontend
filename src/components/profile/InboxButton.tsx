"use client"

/* eslint-disable @eslint-react/dom-no-dangerously-set-innerhtml -- Notification HTML is sanitized with DOMPurify at each insertion point. */

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import * as Popover from "@radix-ui/react-popover"
import DOMPurify from "isomorphic-dompurify"
import { Bell, X } from "lucide-react"

import { apiGet, apiPatch } from "@/api/client"
import { toast } from "@/components/ui/toast"
import { LoadingArea } from "@/components/ui/spinner"
import { t, locale } from "@/i18n/t"
import { onServiceRestored } from "@/lib/serviceStatus"
import { NotificationMessageCard } from "./NotificationMessageCard"
import { NotificationPopIn, popInDuration } from "./NotificationPopIn"

type Message = {
  ID: string
  Title: string
  Body: string
  Link: string
  Icon?: string
  Tone?: string
  AccentColor?: string
  AutoDismissMs?: number | null
  Actions?: { label: string; href: string }[] | null
  ReadAt: string | null
  CreatedAt: string
  // Set when the notification belongs to an Event; labelled with its name.
  EventID?: string | null
  EventName?: string | null
  EventTag?: string | null
}
type InboxCursor = { ID: string; CreatedAt: string }
type InboxPoll = { Cursor: InboxCursor | null; NewInbox: Message[]; UnreadCount: number }
type InboxPage = { Items: Message[]; NextCursor: InboxCursor | null }
const READ_SYNC_KEY = "cybericebox:inbox-read"

function EventLabel({ name }: { name?: string | null }) {
  if (!name) return null
  return <span className="max-w-[60%] truncate rounded bg-soft px-1.5 py-0.5 text-[11px] font-medium text-dim">{name}</span>
}

function safeHref(value: string): string | null {
  const href = value.trim()
  if (href.startsWith("/") && !href.startsWith("//")) return href
  if (href.startsWith("#") || /^https?:\/\/|^mailto:/i.test(href)) return href
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
  const [popIns, setPopIns] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [olderCursor, setOlderCursor] = useState<InboxCursor | null>(null)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState("")
  const cursorRef = useRef<InboxCursor | null>(null)
  const unreadCountRef = useRef(0)
  const olderCursorRef = useRef<InboxCursor | null>(null)
  const loadingOlderRef = useRef(false)
  const listRevisionRef = useRef(0)
  const openRef = useRef(false)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const lastItemRef = useRef<HTMLLIElement | null>(null)
  const lastItemID = items[items.length - 1]?.ID

  const loadOlder = useCallback(async () => {
    const before = olderCursorRef.current
    if (!before || loadingOlderRef.current) return
    const revision = listRevisionRef.current
    loadingOlderRef.current = true
    setLoadingOlder(true)
    try {
      const query = new URLSearchParams({ before_id: before.ID, before_at: before.CreatedAt })
      const page = await apiGet<InboxPage>(`/api/notifications/inbox?${query}`)
      if (revision !== listRevisionRef.current) return
      olderCursorRef.current = page.NextCursor
      setOlderCursor(page.NextCursor)
      setItems((previous) => {
        const known = new Set(previous.map((item) => item.ID))
        return [...previous, ...page.Items.filter((item) => !known.has(item.ID))]
      })
      setError("")
    } catch { setError(t("inbox.loadError")) }
    finally { loadingOlderRef.current = false; setLoadingOlder(false) }
  }, [])

  useEffect(() => {
    const area = scrollAreaRef.current
    const last = lastItemRef.current
    if (!open || !olderCursor || loading || !area || !last || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void loadOlder()
    }, { root: area })
    observer.observe(last)
    return () => observer.disconnect()
  }, [open, olderCursor, lastItemID, loading, loadOlder])

  const refresh = useCallback((): Promise<Message[] | null> => {
    const revision = ++listRevisionRef.current
    return apiGet<InboxPage>("/api/notifications/inbox")
      .then((page) => {
        if (revision !== listRevisionRef.current) return null
        const list = page.Items ?? []
        olderCursorRef.current = page.NextCursor
        setOlderCursor(page.NextCursor)
        // An older refresh must not undo a successful read action.
        setItems((previous) => list.map((item) => ({
          ...item,
          ReadAt: item.ReadAt ?? previous.find((entry) => entry.ID === item.ID)?.ReadAt ?? null,
        })))
        const readById = new Map(list.map((item) => [item.ID, item.ReadAt]))
        setPopIns((previous) => previous.filter((item) => !readById.get(item.ID)))
        setError("")
        return list
      })
      .catch(() => { setError(t("inbox.loadError")); return null })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true
    let initialized = false
    let polling = false
    let pending = false
    const poll = async () => {
      if (!active) return
      if (polling) { pending = true; return }
      polling = true
      try {
        if (!initialized) {
          const baseline = await apiGet<InboxPoll>("/api/notifications/inbox/poll")
          if (!active) return
          cursorRef.current = baseline.Cursor ?? { ID: "00000000-0000-0000-0000-000000000000", CreatedAt: "1970-01-01T00:00:00Z" }
          unreadCountRef.current = baseline.UnreadCount
          setUnread(baseline.UnreadCount)
          initialized = true
          await refresh()
          return
        }
        const since = cursorRef.current!
        const query = new URLSearchParams({ since_id: since.ID, since_at: since.CreatedAt })
        const result = await apiGet<InboxPoll>(`/api/notifications/inbox/poll?${query}`)
        if (!active) return
        cursorRef.current = result.Cursor ?? since
        const fresh = (result.NewInbox ?? []).filter((item) => !item.ReadAt)
        if (openRef.current && result.NewInbox?.length) {
          setItems((previous) => {
            const known = new Set(previous.map((item) => item.ID))
            return [...result.NewInbox.filter((item) => !known.has(item.ID)).reverse(), ...previous]
          })
        }
        let poppable = fresh.filter((item) => popInDuration(item.AutoDismissMs) > 0)
        if (result.UnreadCount !== unreadCountRef.current + fresh.length) {
          const latest = await refresh()
          poppable = latest ? poppable.filter((item) => latest.some((entry) => entry.ID === item.ID && !entry.ReadAt)) : []
        } else {
          setError("")
        }
        unreadCountRef.current = result.UnreadCount
        setUnread(result.UnreadCount)
        if (active && poppable.length) setPopIns((previous) => [...previous, ...poppable.filter((item) => !previous.some((entry) => entry.ID === item.ID))])
      } catch {
        if (active) { setError(t("inbox.loadError")); setLoading(false) }
      } finally {
        polling = false
        if (pending && active) { pending = false; queueMicrotask(() => { void poll() }) }
      }
    }
    const pollWhenVisible = () => { if (document.visibilityState !== "hidden") void poll() }
    void poll()
    const unsubscribe = onServiceRestored(pollWhenVisible)
    const timer = window.setInterval(pollWhenVisible, 8_000)
    document.addEventListener("visibilitychange", pollWhenVisible)
    window.addEventListener("focus", pollWhenVisible)
    const onStorage = (event: StorageEvent) => { if (event.key === READ_SYNC_KEY) { void pollWhenVisible(); if (openRef.current) void refresh() } }
    window.addEventListener("storage", onStorage)
    return () => {
      active = false
      unsubscribe()
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", pollWhenVisible)
      window.removeEventListener("focus", pollWhenVisible)
      window.removeEventListener("storage", onStorage)
    }
  }, [refresh])

  const label = unread ? `${t("inbox.title")}: ${unread} ${t("inbox.unread")}` : t("inbox.title")

  function announceRead() {
    try {
      const previous = window.localStorage.getItem(READ_SYNC_KEY)
      window.localStorage.setItem(READ_SYNC_KEY, previous === "1" ? "0" : "1")
    } catch { /* Polling still synchronizes read state. */ }
  }

  async function markRead(item: Message): Promise<boolean> {
    if (item.ReadAt) return true
    try {
      await apiPatch(`/api/notifications/inbox/${encodeURIComponent(item.ID)}/read`, {})
      unreadCountRef.current = Math.max(0, unreadCountRef.current - 1)
      setUnread(unreadCountRef.current)
      setItems((current) => current.map((entry) => entry.ID === item.ID ? { ...entry, ReadAt: new Date().toISOString() } : entry))
      setPopIns((current) => current.filter((entry) => entry.ID !== item.ID))
      announceRead()
      return true
    } catch {
      setError(t("inbox.readError"))
      return false
    }
  }

  async function followLink(item: Message, href: string) {
    if (!(await markRead(item))) return
    setOpen(false)
    openRef.current = false
    window.location.assign(href)
  }

  async function readAll() {
    setError("")
    try {
      await apiPatch("/api/notifications/inbox/read-all", {})
      const now = new Date().toISOString()
      unreadCountRef.current = 0
      setUnread(0)
      setItems((current) => current.map((item) => ({ ...item, ReadAt: item.ReadAt ?? now })))
      setPopIns([])
      announceRead()
      toast.success(t("inbox.allRead"))
    } catch {
      toast.error(t("inbox.readError"))
    }
  }

  return <><Popover.Root open={open} onOpenChange={(next) => {
    openRef.current = next
    setOpen(next)
    if (next) void refresh()
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
          <h2><span className="sr-only">{t("inbox.title")}</span><Bell size={19} aria-hidden="true" className="text-dim" /></h2>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" disabled={unread === 0} onClick={() => void readAll()} className="rounded-md px-2 py-1 text-xs font-medium text-action hover:bg-hover focus-visible:outline-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">{t("inbox.readAll")}</button>
            <Popover.Close aria-label={t("inbox.close")} className="rounded-md p-1 text-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-action"><X size={16} /></Popover.Close>
          </div>
        </div>
        {error && <p role="alert" className="mx-3 mt-3 rounded-md bg-[var(--ib-danger-bg)] p-2 text-xs text-[var(--ib-danger)]">{error}</p>}
        <div ref={scrollAreaRef} className="min-h-0 overflow-y-auto">
          {loading ? <LoadingArea label={t("common.loading")} /> : items.length === 0 ? <EmptyInbox /> : <ul className="divide-y divide-line">{items.map((item, index) => {
            const href = safeHref(item.Link ?? "")
            return <li key={item.ID} ref={index === items.length - 1 ? lastItemRef : undefined} className="px-4 py-3 hover:bg-hover">
              <NotificationMessageCard
                icon={item.Icon} tone={item.Tone} accentColor={item.AccentColor} title={item.Title}
                body={item.Body ? <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.Body, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) }} /> : undefined}
                unread={!item.ReadAt} compact
                timestamp={<span className="flex min-w-0 items-center gap-2"><time dateTime={item.CreatedAt}>{new Date(item.CreatedAt).toLocaleString(locale)}</time><EventLabel name={item.EventName} /></span>}
                actions={href ? <a href={href} onClick={(event) => { event.preventDefault(); void followLink(item, href) }} className="text-sm font-medium text-action underline-offset-2 hover:underline">{t("inbox.open")}</a> : !item.ReadAt ? <button type="button" onClick={() => void markRead(item)} className="text-xs font-medium text-action hover:underline">{t("inbox.markRead")}</button> : undefined}
              />
            </li>
          })}</ul>}
          {loadingOlder && <p role="status" className="px-4 py-3 text-center text-xs text-dim">{t("common.loading")}</p>}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
  {popIns.length > 0 && createPortal(<div className="fixed right-4 top-20 z-[70] flex max-h-[calc(100vh-6rem)] flex-col gap-3 overflow-y-auto" aria-live="polite">
    {popIns.slice(0, 3).map((item) => <NotificationPopIn key={item.ID} message={item} onClose={() => setPopIns((current) => current.filter((entry) => entry.ID !== item.ID))} onAction={(href) => { const safe = safeHref(href); if (safe) void followLink(item, safe) }} />)}
  </div>, document.body)}
  </>
}
