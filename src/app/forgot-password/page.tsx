import type { Metadata } from "next"
import { ForgotPasswordScreen } from "@/components/auth/ForgotPasswordScreen"
import { CaptchaPreload } from "@/components/CaptchaPreload"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.forgotPassword") }

export default function ForgotPasswordPage() {
  return (
    <CaptchaPreload>
      <ForgotPasswordScreen />
    </CaptchaPreload>
  )
}
