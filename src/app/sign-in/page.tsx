import { SignInScreen } from "@/components/auth/SignInScreen"
import { RecaptchaGate } from "@/components/RecaptchaGate"

export default function SignInPage() {
  return (
    <RecaptchaGate>
      <SignInScreen />
    </RecaptchaGate>
  )
}
