"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { t } from "@/i18n/t"

// Root route: redirect immediately to /sign-in.
// This is a client component so useRouter is available in the static export.
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/sign-in")
  }, [router])

  // without JavaScript the redirect never runs: a plain link to the sign-in page
  return <noscript><a href="/sign-in/">{t("common.signIn")}</a></noscript>
}
