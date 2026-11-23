import type { Metadata } from "next"
import { StepUpScreen } from "@/components/auth/StepUpScreen"
import { t } from "@/i18n/t"

export const metadata: Metadata = { title: t("meta.stepUp") }

export default function StepUpPage() {
  return <StepUpScreen />
}
