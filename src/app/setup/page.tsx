import type { Metadata } from "next"
import { SetupScreen } from "@/components/auth/SetupScreen"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.setup") }

export default function SetupPage() {
  return <SetupScreen />
}
