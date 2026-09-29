import type { Metadata } from "next"
import { SignUpScreen } from "@/components/auth/SignUpScreen"
import { RecaptchaGate } from "@/components/RecaptchaGate"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.signUp") }

export default function RegisterPage() {
  return (
    <RecaptchaGate>
      <SignUpScreen />
    </RecaptchaGate>
  )
}
