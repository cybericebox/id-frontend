"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Root route: redirect immediately to /sign-in.
// This is a client component so useRouter is available in the static export.
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/sign-in")
  }, [router])

  return null
}
