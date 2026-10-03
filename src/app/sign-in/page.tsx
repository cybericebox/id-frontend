import type { Metadata } from "next"
import { SignInScreen } from "@/components/auth/SignInScreen"
import { CaptchaPreload } from "@/components/CaptchaPreload"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.signIn") }

export default function SignInPage() {
  return (
    <CaptchaPreload>
      <SignInScreen />
    </CaptchaPreload>
  )
}
