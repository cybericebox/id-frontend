import * as React from "react"

import { t } from "@/i18n/t"
import { unmetRules, type PasswordPolicy, type PasswordRule } from "@/lib/passwordPolicy"
import { cn } from "@/utils/cn"


type Tone = "danger" | "warn" | "ok"

const TONE_BG: Record<Tone, string> = { danger: "bg-danger", warn: "bg-warn", ok: "bg-ok" }
const TONE_TEXT: Record<Tone, string> = { danger: "text-danger", warn: "text-warn", ok: "text-ok" }

// Ukrainian plural forms: 1 символ · 2–4 символи · 5+ символів (en uses _one/_many only).
function pluralKey(base: string, n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${base}_one`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${base}_few`
  return `${base}_many`
}

export function ruleMessage(rule: PasswordRule, min: number, value: string): string {
  switch (rule) {
    case "length": {
      const n = min - value.length
      return t(pluralKey("password.more", n), { n })
    }
    case "maxLength":
      return t("password.tooLong", { n: min })
    case "upper":
      return t("password.needUpper")
    case "lower":
      return t("password.needLower")
    case "digit":
      return t("password.needDigit")
    case "special":
      return t("password.needSymbol")
  }
}

/** First unmet policy rule as a form error ("Додайте цифру"), or null when valid. */
export function passwordError(value: string, policy: PasswordPolicy): string | null {
  const u = unmetRules(value, policy)[0]
  if (!u) return null
  const msg = ruleMessage(u.rule, u.min, value)
  return msg.charAt(0).toUpperCase() + msg.slice(1)
}

// Live password strength: 4-segment bar + status + hint, recomputed on every
// keystroke against the backend policy.
//  - a required rule is unmet → red/amber bar, «Слабкий/Середній» + what is missing
//  - all required rules met   → «Добрий», or «Надійний» with 12+ chars and a symbol
export function PasswordStrength({
  value,
  policy,
  className,
}: {
  value: string
  policy: PasswordPolicy
  className?: string
}) {
  if (!value) return null

  const unmet = unmetRules(value, policy)
  const required =
    1 +
    [policy.MinCapitalLetters, policy.MinSmallLetters, policy.MinDigits, policy.MinSpecialCharacters].filter((n) => n > 0)
      .length
  const hasSymbol = [...value].some((ch) => !/[A-Za-z0-9]/.test(ch))

  let segments: number
  let tone: Tone
  let label: string
  let hint: string | null = null

  if (unmet.length > 0) {
    segments = required - unmet.length <= required / 2 ? 1 : 2
    tone = segments === 1 ? "danger" : "warn"
    label = t(segments === 1 ? "password.weak" : "password.fair")
    hint = ruleMessage(unmet[0].rule, unmet[0].min, value)
  } else if (value.length >= 12 && hasSymbol) {
    segments = 4
    tone = "ok"
    label = t("password.strong")
  } else {
    segments = 3
    tone = "ok"
    label = t("password.good")
    hint = t(value.length < 12 ? "password.hintLonger" : "password.hintSymbol")
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)} aria-live="polite">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 rounded-full transition-colors", i < segments ? TONE_BG[tone] : "bg-line")} />
        ))}
      </div>
      <p className="text-xs text-dim">
        <span className={cn("font-medium", TONE_TEXT[tone])}>{label}</span>
        {hint && <> · {hint}</>}
      </p>
    </div>
  )
}
