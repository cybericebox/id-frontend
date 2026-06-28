"use client"
import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { setAuthChangedHandler, runSilentAuthOnce } from "@/lib/silentAuth"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient())
  useEffect(() => {
    // When the silent iframe plants a token, refetch everything that resolved anon.
    setAuthChangedHandler(() => { void qc.invalidateQueries() })
    // Kick the one-shot bootstrap early (it is also triggered lazily by the first
    // api/client call, but starting it here trims first-paint latency). No render gate.
    void runSilentAuthOnce()
  }, [qc])
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
