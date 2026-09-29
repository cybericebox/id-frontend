import type { Metadata } from "next"
import "./globals.css"
import { QueryProvider } from "@/components/QueryProvider"
import { ServiceStatusGate } from "@/components/ServiceStatusGate"
import { GoogleAnalytics } from "@next/third-parties/google"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { THEME_BOOT_SCRIPT } from "@/lib/theme"
import { ToastProvider } from "@/components/ui/toast"
import { t } from "@/i18n/t"

export const metadata: Metadata = {
  title: { default: `${t("meta.default")} · ${t("meta.brand")}`, template: `%s · ${t("meta.brand")}` },
  description: t("meta.description"),
  // noindex also as a meta tag: static hosts (GitHub Pages) cannot send X-Robots-Tag.
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // data-theme is set by the boot script before hydration — hence suppressHydrationWarning.
    <html lang="uk" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* static constant, no user input — runs before paint to avoid a light flash */}
        {/* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <QueryProvider><ToastProvider>{children}</ToastProvider></QueryProvider>
        <ServiceStatusGate />
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />}
      </body>
    </html>
  )
}
