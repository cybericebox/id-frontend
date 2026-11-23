import type { Metadata } from "next"
import { RecoverySignInScreen } from "@/components/auth/RecoverySignInScreen"
import { CaptchaPreload } from "@/components/CaptchaPreload"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.recoverySignIn") }

export default function RecoverySignInPage() {
  return (
    <CaptchaPreload>
      <RecoverySignInScreen />
    </CaptchaPreload>
  )
}
