import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form"
import { ApiError } from "@/api/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/toast"
import { isServiceUnavailable, localizedError } from "@/i18n/apiError"

/**
 * Form-level failure (expired link, rate limit): an inline alert next to the submit button that stays
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

/** Stable, endpoint-specific codes only; ambiguous credentials and generic failures stay on the form. */
export function fieldErrorMessage(err: unknown, codes: readonly number[]): string | null {
  return err instanceof ApiError && err.status < 500 && err.code != null && codes.includes(err.code)
    ? localizedError(err) : null
}

export function reportFieldOrFormError<T extends FieldValues>(
  err: unknown,
  setFormError: (message: string) => void,
  setFieldError: UseFormSetError<T>,
  fields: Readonly<Record<number, FieldPath<T>>>,
) {
  const field = err instanceof ApiError && err.status < 500 && err.code != null ? fields[err.code] : undefined
  if (field) setFieldError(field, { type: "server", message: localizedError(err) }, { shouldFocus: true })
  else reportFormError(err, setFormError)
}
