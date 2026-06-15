import type { Metadata } from "next"
import "./globals.css"
import Providers from "@/components/providers"

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
    <html lang="en">
      <body className="grid-bg">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
