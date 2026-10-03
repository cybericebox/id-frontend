import type { Metadata } from "next"
import { SignUpScreen } from "@/components/auth/SignUpScreen"
import { CaptchaPreload } from "@/components/CaptchaPreload"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.signUp") }

export default function RegisterPage() {
  return (
    <CaptchaPreload>
      <SignUpScreen />
    </CaptchaPreload>
  )
}
