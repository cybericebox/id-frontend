"use client"

import { useEffect, useRef, type ComponentPropsWithRef } from "react"
import { usePathname } from "next/navigation"
import { t } from "@/i18n/t"
import { feedbackHref } from "@/lib/feedback"

// A plain <a href="mailto:…"> that sits in the footer (or the account menu): it is part of the server-rendered /
// static HTML, so it works without JavaScript (wrap it in <EmailOff> there, so Cloudflare does not rewrite the href). usePathname still renders on the static pass (the path of the page
// being built). `app` overrides the app name in the subject; the rest of the props pass through, so a menu item
// can wrap it with `asChild` (className, ref, children).
// Cloudflare may still rewrite the href to /cdn-cgi/l/email-protection (its ownRef decoder script then needs JS and a
// loose CSP), so after hydration the href is set again at runtime from the bundle, which Cloudflare never touches.
export function FeedbackLink({ app, children, ref, ...rest }: { app?: string } & Omit<ComponentPropsWithRef<"a">, "href">) {
  const pathname = usePathname() || "/"
  const subject = t("feedback.subject", { app: app ?? t("feedback.app"), page: pathname })
  const href = feedbackHref(subject)
  const ownRef = useRef<HTMLAnchorElement | null>(null)
  useEffect(() => {
    if (ownRef.current && ownRef.current.getAttribute("href") !== href) ownRef.current.setAttribute("href", href)
  }, [href])
  const setRef = (node: HTMLAnchorElement | null) => {
    ownRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }
  return (
    <a {...rest} ref={setRef} href={href} suppressHydrationWarning>
      {children ?? t("feedback.link")}
    </a>
  )
}
