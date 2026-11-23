"use client"

import React, { useState } from "react"

import type { Account } from "./types"
import { EmailCard } from "./EmailCard"
import { PasswordCard } from "./PasswordCard"
import { PasskeysCard } from "./PasskeysCard"
import { SecondFactorCard } from "./SecondFactorCard"
import { GoogleCard } from "./GoogleCard"

// "Sign-in and security": everything that proves who the user is, in the order of the spec: email, password, passkeys,
// two-step verification, Google. A passkey counts as a second factor, so a passkey change reads the status again.
export function LoginSecurityTab({
  account,
  linkError,
  onUpdated,
}: {
  account: Account
  linkError: string | null
  onUpdated: () => void
}) {
  const [factorsVersion, setFactorsVersion] = useState(0)
  return (
    <div className="space-y-6">
      <EmailCard account={account} />
      <PasswordCard account={account} />
      <PasskeysCard account={account} onChanged={() => setFactorsVersion((v) => v + 1)} />
      <SecondFactorCard account={account} refreshKey={factorsVersion} />
      <GoogleCard account={account} linkError={linkError} onUpdated={onUpdated} />
    </div>
  )
}
