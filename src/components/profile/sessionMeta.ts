import type { ReactNode } from "react"
import { t, tRich } from "@/i18n/t"

// lastActivityLine is the "last activity" meta line of a session; the address is shown only when the
// session has one (sessions without a stored address show the activity alone).
export function lastActivityLine(ip: string | null | undefined, date: string): string {
  const address = (ip ?? "").trim()
  return address
    ? t("profile.sessions.lastActivityLine", { ip: address, date })
    : t("profile.sessions.lastActivityNoIpLine", { date })
}

// The same line for the session card: the address goes in as an element, so only it may break anywhere (a long IPv6)
// while the words of the line wrap normally.
export function lastActivityContent(ip: string | null | undefined, date: string, renderAddress: (address: string) => ReactNode): ReactNode {
  const address = (ip ?? "").trim()
  return address
    ? tRich("profile.sessions.lastActivityLine", { ip: renderAddress(address), date })
    : t("profile.sessions.lastActivityNoIpLine", { date })
}
