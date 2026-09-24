"use client"

/**
 * Password policy — the backend's complexity thresholds (env-configured) served
 * by GET /api/auth/password/policy. The form validates and the strength bar
 * hints against the SAME rules the backend enforces (pkg/password), so a
 * password the UI accepts is never rejected with 20409.
 *
 * Character classes mirror the backend exactly: upper A–Z, lower a–z, digits
 * 0–9 (ASCII only) and the backend's SpecialCharacters set.
 */

import { useEffect, useState } from "react"
import { apiGet } from "@/api/client"

export interface PasswordPolicy {
  MinLength: number
  MaxLength: number
  MinCapitalLetters: number
  MinSmallLetters: number
  MinDigits: number
  MinSpecialCharacters: number
  SpecialCharacters: string
}

// Same values as the backend defaults — used until (or if) the fetch fails.
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  MinLength: 8,
  MaxLength: 72,
  MinCapitalLetters: 1,
  MinSmallLetters: 1,
  MinDigits: 1,
  MinSpecialCharacters: 0,
  SpecialCharacters: "!\"#$%&'()*+,-./",
}

let cached: Promise<PasswordPolicy> | null = null

export function loadPasswordPolicy(): Promise<PasswordPolicy> {
  cached ??= apiGet<PasswordPolicy>("/api/auth/password/policy", undefined, { required: false })
    .then((p) => ({ ...DEFAULT_PASSWORD_POLICY, ...p }))
    .catch(() => DEFAULT_PASSWORD_POLICY)
  return cached
}

export function usePasswordPolicy(): PasswordPolicy {
  const [policy, setPolicy] = useState(DEFAULT_PASSWORD_POLICY)
  useEffect(() => {
    let alive = true
    loadPasswordPolicy().then((p) => alive && setPolicy(p))
    return () => { alive = false }
  }, [])
  return policy
}

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length

export type PasswordRule = "length" | "maxLength" | "upper" | "lower" | "digit" | "special"

/** Rules from the policy that `value` does not meet yet, in the backend's check order. */
export function unmetRules(value: string, p: PasswordPolicy): { rule: PasswordRule; min: number }[] {
  const specials = [...value].filter((ch) => p.SpecialCharacters.includes(ch)).length
  const out: { rule: PasswordRule; min: number }[] = []
  if (value.length < p.MinLength) out.push({ rule: "length", min: p.MinLength })
  if (p.MaxLength > 0 && value.length > p.MaxLength) out.push({ rule: "maxLength", min: p.MaxLength })
  if (count(value, /[A-Z]/g) < p.MinCapitalLetters) out.push({ rule: "upper", min: p.MinCapitalLetters })
  if (count(value, /[a-z]/g) < p.MinSmallLetters) out.push({ rule: "lower", min: p.MinSmallLetters })
  if (count(value, /[0-9]/g) < p.MinDigits) out.push({ rule: "digit", min: p.MinDigits })
  if (specials < p.MinSpecialCharacters) out.push({ rule: "special", min: p.MinSpecialCharacters })
  return out
}
