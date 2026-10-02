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
}: {
  id: string
  hint: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-dim">{hint}</p>
      <Label htmlFor={id}>{t("profile.security.currentPassword")}</Label>
      <PasswordInput
        id={id}
        autoComplete="current-password"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
