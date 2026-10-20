"use client"

import { useEffect } from "react"
import { installChunkRecovery } from "@/lib/chunkRecovery"
import { ErrorScreen } from "@/components/ErrorPage"

// Segment error boundary: replaces Next's built-in «This page couldn't load» fallback.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    installChunkRecovery(window).recover(error)
    // details stay out of the UI; developers see them in the console
    if (process.env.NODE_ENV !== "production") console.error(error)
  }, [error])

  return <ErrorScreen onRetry={() => installChunkRecovery(window).retry(error, retry)} error={error} />
}
