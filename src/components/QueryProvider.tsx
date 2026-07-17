"use client"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient())
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
