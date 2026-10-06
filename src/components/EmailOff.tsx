import type { ReactNode } from "react"

// Cloudflare «Email Address Obfuscation» rewrites every mailto: link of an HTML response into
// /cdn-cgi/l/email-protection#… and needs its decoder script, so the link stops working without JavaScript (and
// under a strict CSP). The documented opt-out is a pair of HTML comments around the markup:
// <!--email_off--> … <!--/email_off-->. React cannot emit a bare comment, so each marker sits in an empty hidden
// span; Cloudflare matches the text of the response, so the anchor between the two spans is left untouched.
// Wrap only links that are part of the static (server-rendered) HTML; client-rendered ones are never rewritten.
// Without Cloudflare the markers are inert. (Turning the feature off for the zone in Scrape Shield makes this unnecessary.)
function Marker({ html }: { html: string }) {
  // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- a constant comment, no user input
  return <span hidden dangerouslySetInnerHTML={{ __html: html }} />
}

export function EmailOff({ children }: { children: ReactNode }) {
  return (
    <>
      <Marker html="<!--email_off-->" />
      {children}
      <Marker html="<!--/email_off-->" />
    </>
  )
}
