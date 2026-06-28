import { ForgotPasswordScreen } from "@/components/auth/ForgotPasswordScreen"
import { RecaptchaGate } from "@/components/RecaptchaGate"

export default function ForgotPasswordPage() {
  return (
    <RecaptchaGate>
      <ForgotPasswordScreen />
    </RecaptchaGate>
  )
}
