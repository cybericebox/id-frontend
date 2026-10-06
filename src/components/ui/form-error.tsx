import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/toast"
import { isServiceUnavailable, localizedError } from "@/i18n/apiError"

/**
 * Form-level failure (wrong password, expired link, rate limit): an inline alert next to the submit button that stays
 * until the next attempt, so a long message («Спробуйте ще раз через 5 хв») is not gone before it is read.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

/**
 * Reports a failed submit: an outage is global (the service notice and a toast), everything else belongs to the form
 * and goes inline through `setError`.
 */
export function reportFormError(err: unknown, setError: (message: string) => void) {
  const message = localizedError(err)
  if (isServiceUnavailable(err)) toast.error(message)
  else setError(message)
}
