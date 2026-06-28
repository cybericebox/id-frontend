import { SignUpScreen } from "@/components/auth/SignUpScreen"
import { RecaptchaGate } from "@/components/RecaptchaGate"

export default function RegisterPage() {
  return (
    <RecaptchaGate>
      <SignUpScreen />
    </RecaptchaGate>
  )
}
