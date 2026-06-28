import type { Metadata } from "next"
import "./globals.css"
import Providers from "@/components/providers"
import { QueryProvider } from "@/components/QueryProvider"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

export const metadata: Metadata = {
  title: "Cyber ICE Box Platform ID",
  description: "Cyber ICE Box Platform ID — identity & authentication portal",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="grid-bg">
        <Providers><QueryProvider>{children}</QueryProvider></Providers>
      </body>
    </html>
  )
}
