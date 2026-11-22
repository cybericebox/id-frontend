import type { Metadata } from "next"
import { GoogleConfirmScreen } from "@/components/auth/GoogleConfirmScreen"
import { CaptchaPreload } from "@/components/CaptchaPreload"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.googleConfirm") }

export default function GoogleConfirmPage() {
  return (
    <CaptchaPreload>
      <GoogleConfirmScreen />
    </CaptchaPreload>
  )
}
