import type { Metadata } from "next"
import { ResetPasswordScreen } from "@/components/auth/ResetPasswordScreen"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.resetPassword") }

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />
}
