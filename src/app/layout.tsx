import type { Metadata } from "next"
import "./globals.css"
import Providers from "@/components/providers"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

export const metadata: Metadata = {
  title: "CyberICEBox ID",
  description: "CyberICEBox identity & authentication portal",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="grid-bg">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
