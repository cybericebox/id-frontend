import type { Metadata } from "next"
import "./globals.css"
import { QueryProvider } from "@/components/QueryProvider"
import { ServiceStatusGate } from "@/components/ServiceStatusGate"
import { Analytics } from "@/components/Analytics"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { THEME_BOOT_SCRIPT } from "@/lib/theme"
import { ToastProvider } from "@/components/ui/toast"
import { SiteBanners } from "@/components/SiteBanners"
import { t } from "@/i18n/t"

export const metadata: Metadata = {
  title: { default: t("meta.defaultTitle"), template: t("meta.titleTemplate") },
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
        {/* site banners sit at the very top, above the split auth layout */}
        <SiteBanners />
        <QueryProvider><ToastProvider>{children}</ToastProvider></QueryProvider>
        <ServiceStatusGate />
        {/* the consent panel is always mounted («Налаштування файлів cookie»); GA loads only when configured */}
        <Analytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
      </body>
    </html>
  )
}
