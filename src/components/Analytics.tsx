import Script from "next/script"
import { gtagBootScript } from "@/lib/consent"
import { ConsentBanner } from "./ConsentBanner"

// Google Analytics (gtag) under Consent Mode v2. The inline boot sets the denied defaults and the
// stored choice before gtag.js runs (see lib/consent). reCAPTCHA is not part of consent (strictly necessary).
export function Analytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {gtagBootScript(gaId)}
      </Script>
      <Script id="ga" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} />
      <ConsentBanner gaId={gaId} />
    </>
  )
}
