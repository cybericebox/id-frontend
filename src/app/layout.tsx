import type { Metadata } from "next"
import "./globals.css"

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
      <body>{children}</body>
    </html>
  )
}
