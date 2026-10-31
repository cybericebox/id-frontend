"use client"

import { useEffect } from "react"
import { fetchMe } from "@/lib/auth"
import { t } from "@/i18n/t"
import { PageLoader } from "@/components/ui/spinner"

// Root route: a signed-in visitor goes straight to /profile, everyone else (and an unanswered check) to /sign-in.
// This is a client component so the check can run in the static export.
export default function RootPage() {
  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((me) => me ? "/profile/" : "/sign-in/")
      .catch(() => "/sign-in/")
      .then((to) => { if (!cancelled) window.location.replace(to) })
    return () => { cancelled = true }
  }, [])

  // without JavaScript the redirect never runs: a plain link to the sign-in page
  return (
    <>
      <PageLoader />
      <noscript><a href="/sign-in/">{t("common.signIn")}</a></noscript>
    </>
  )
}
