"use client"

import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { t } from "@/i18n/t"

// Current-password field of a confirmation dialog (delete account, unlink Google).
export function ReauthPasswordField({
  id,
  hint,
  value,
  onChange,
  disabled,
  error,
}: {
  id: string
  hint: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  error?: string | null
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-dim">{hint}</p>
      <Label htmlFor={id}>{t("profile.security.currentPassword")}</Label>
      <PasswordInput
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="current-password"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}
