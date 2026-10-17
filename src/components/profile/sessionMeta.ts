import { t } from "@/i18n/t"

// lastActivityLine is the "last activity" meta line of a session; the address is shown only when the
// session has one (sessions without a stored address show the activity alone).
export function lastActivityLine(ip: string | null | undefined, date: string): string {
  const address = (ip ?? "").trim()
  return address
    ? t("profile.sessions.lastActivityLine", { ip: address, date })
    : t("profile.sessions.lastActivityNoIpLine", { date })
}
