import type React from "react"
import type { Metadata } from "next"
import { t } from "@/i18n/t"

// The page is a client component, so its title lives in this segment layout.
export const metadata: Metadata = { title: t("meta.signOut") }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
