import * as z from "zod"
import type { RefObject } from "react"

import { passwordError } from "@/components/ui/password-strength"
import type { PasswordPolicy } from "@/lib/passwordPolicy"
import { t } from "@/i18n/t"

// ---------------------------------------------------------------------------
// Zod schema — client-side validation
// Password and ConfirmPassword are always strings (empty = no password chosen).
//
// The ≥1-method rule depends on whether Google is already linked. We inject
// this as a mutable ref so the stable schema closure can always read the
// latest value without needing to be rebuilt on every render.
// ---------------------------------------------------------------------------
const BaseSetupSchema = z.object({
  FirstName: z
    .string()
    .min(1, { message: t("validation.required") })
    .max(255),
  LastName: z
    .string()
    .min(1, { message: t("validation.required") })
    .max(255),
  Password: z.string().max(255),
  ConfirmPassword: z.string().max(255),
  AcceptTos: z.boolean(),
})

export type SetupValues = z.infer<typeof BaseSetupSchema>

/**
 * Returns a schema whose superRefine reads hasGoogle from the supplied ref.
 * Call this ONCE (e.g. with React.useMemo / outside re-renders) and update
 * the ref whenever hasGoogle changes.
 */
export function buildSetupSchema(
  hasGoogleRef: RefObject<boolean>,
  policyRef: RefObject<PasswordPolicy>
) {
  return BaseSetupSchema.superRefine((data, ctx) => {
    // An entered password must pass the backend policy (empty = no password).
    if (data.Password) {
      const msg = passwordError(data.Password, policyRef.current)
      if (msg) ctx.addIssue({ code: "custom", message: msg, path: ["Password"] })
    }

    // The confirmation is required whenever a password is required or typed, and must match it.
    const passwordRequired = !hasGoogleRef.current
    if (data.Password || passwordRequired) {
      if (!data.ConfirmPassword) {
        ctx.addIssue({ code: "custom", message: t("validation.required"), path: ["ConfirmPassword"] })
      } else if (data.Password !== data.ConfirmPassword) {
        ctx.addIssue({ code: "custom", message: t("validation.passwordsNoMatch"), path: ["ConfirmPassword"] })
      }
    }

    // At least one method: password or Google
    const hasPassword = Boolean(data.Password && data.Password.length > 0)
    if (!hasPassword && !hasGoogleRef.current) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validation.methodRequired"),
        path: ["Password"],
      })
    }

    // ToS must be accepted
    if (!data.AcceptTos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("validation.tosRequired"),
        path: ["AcceptTos"],
      })
    }
  })
}

