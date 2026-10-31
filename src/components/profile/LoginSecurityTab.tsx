"use client"

import React from "react"

import type { Account } from "./types"
import { EmailCard } from "./EmailCard"
import { PasswordCard } from "./PasswordCard"
import { PasskeysCard } from "./PasskeysCard"
import { GoogleCard } from "./GoogleCard"

// «Вхід і безпека»: everything that proves who the user is, in the order of the spec: email, password, passkeys, Google.
export function LoginSecurityTab({
  account,
  linkError,
  onUpdated,
}: {
  account: Account
  linkError: string | null
  onUpdated: () => void
}) {
  return (
    <div className="space-y-6">
      <EmailCard account={account} />
      <PasswordCard account={account} />
      <PasskeysCard account={account} />
      <GoogleCard account={account} linkError={linkError} onUpdated={onUpdated} />
    </div>
  )
}
