"use client"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// Queries do not retry: the fetch layer (api/retry) already repeats overload answers, and a 4xx must not repeat.
export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [qc] = useState(createQueryClient)
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
