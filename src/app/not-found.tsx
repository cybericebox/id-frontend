import type { Metadata } from "next"
import { t } from "@/i18n/t"
import { NotFoundScreen } from "@/components/NotFoundScreen"

export const metadata: Metadata = { title: t("error.notFound") }

// Next answers with a real 404 for this file (static export: 404.html).
export default function NotFound() {
  return <NotFoundScreen />
}
