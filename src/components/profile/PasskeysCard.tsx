"use client"

import React, { useCallback, useEffect, useState } from "react"
import { KeyRound, Trash2 } from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingArea } from "@/components/ui/spinner"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadError } from "@/components/ui/load-error"
import { fieldErrorMessage } from "@/components/ui/form-error"
import { toast } from "@/components/ui/toast"
import { apiGet, apiPost, apiDelete, ApiError } from "@/api/client"
import { redirectToSignIn } from "@/lib/auth"
import { localizedError } from "@/i18n/apiError"
import { t, locale } from "@/i18n/t"
import { createPasskey, isPasskeyDismissed, passkeysSupported, type PasskeyCeremony } from "@/lib/passkey"
import type { Account } from "./types"
import { ReauthPasswordField } from "./ReauthPasswordField"

// Shape of one entry of GET /api/auth/passkeys (daemon passkeyResponse, PascalCase JSON).
interface Passkey {
  ID: string
  Name: string
  CreatedAt: string
  LastUsedAt: string | null
}

const NAME_MAX = 64
const WRONG_PASSWORD = 20410
const REAUTH_REQUIRED = 60429

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
}

export function PasskeysCard({ account }: { account: Account }) {
  const [items, setItems] = useState<Passkey[] | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const supported = passkeysSupported()

  const load = useCallback(async () => {
    try {
      setItems(await apiGet<Passkey[]>("/api/auth/passkeys"))
      setLoadError(null)
    } catch (err) {
      setLoadError(err)
    }
  }, [])
  useEffect(() => { void load() }, [load])

  // add
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState("")
  const [addPassword, setAddPassword] = useState("")
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState("")
  const [addPasswordError, setAddPasswordError] = useState<string | null>(null)
  const [addNameError, setAddNameError] = useState<string | null>(null)

  const add = async () => {
    const name = addName.trim()
    if (!name) { setAddNameError(t("validation.required")); return }
    setAddBusy(true)
    setAddError("")
    setAddPasswordError(null)
    setAddNameError(null)
    try {
      const ceremony = await apiPost<PasskeyCeremony>(
        "/api/auth/passkeys/registration/begin",
        account.HasPassword ? { CurrentPassword: addPassword } : {},
      )
      const credential = await createPasskey(ceremony.Options)
      const created = await apiPost<Passkey>("/api/auth/passkeys/registration/finish", {
        CeremonyID: ceremony.CeremonyID,
        Name: name,
        Credential: credential,
      })
      setItems((list) => [...(list ?? []), created])
      setAddOpen(false)
      toast.success(t("profile.passkeys.added"))
    } catch (err) {
      if (isPasskeyDismissed(err)) setAddError(t("profile.passkeys.cancelled"))
      else {
        const passwordError = account.HasPassword ? fieldErrorMessage(err, [WRONG_PASSWORD]) : null
        if (passwordError) setAddPasswordError(passwordError)
        else setAddError(localizedError(err))
      }
    } finally {
      setAddBusy(false)
    }
  }

  // remove
  const [removeTarget, setRemoveTarget] = useState<Passkey | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState("")
  const [removePassword, setRemovePassword] = useState("")
  const [removePasswordError, setRemovePasswordError] = useState<string | null>(null)

  const remove = async () => {
    if (!removeTarget) return
    setRemoveBusy(true)
    setRemoveError("")
    setRemovePasswordError(null)
    try {
      await apiDelete(
        `/api/auth/passkeys/${encodeURIComponent(removeTarget.ID)}`,
        undefined,
        undefined,
        account.HasPassword ? { CurrentPassword: removePassword } : undefined,
      )
      setItems((list) => (list ?? []).filter((p) => p.ID !== removeTarget.ID))
      setRemoveTarget(null)
      toast.success(t("profile.passkeys.removed"))
    } catch (err) {
      const passwordError = account.HasPassword ? fieldErrorMessage(err, [WRONG_PASSWORD]) : null
      if (passwordError) setRemovePasswordError(passwordError)
      // An account without a password needs a fresh sign-in: sign in again and come back here.
      else if (err instanceof ApiError && err.code === REAUTH_REQUIRED) redirectToSignIn(err.signInUrl, window.location.href)
      else setRemoveError(localizedError(err))
    } finally {
      setRemoveBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.passkeys.title")}</CardTitle>
        <CardDescription>{t("profile.passkeys.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items === null && !loadError ? (
          <LoadingArea label={t("common.loading")} />
        ) : loadError ? (
          <LoadError message={t("profile.passkeys.loadError")} error={loadError} onRetry={() => { setLoadError(null); void load() }} />
        ) : items && items.length === 0 ? (
          <EmptyState message={t("profile.passkeys.empty")} />
        ) : (
          <ul aria-label={t("profile.passkeys.list")} className="space-y-3">
            {(items ?? []).map((p) => (
              <li key={p.ID} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <KeyRound className="h-4 w-4 shrink-0 text-dim" aria-hidden="true" />
                    <span className="break-words [overflow-wrap:anywhere]">{p.Name}</span>
                  </p>
                  <p className="mt-1 text-xs text-dim">
                    {p.LastUsedAt
                      ? t("profile.passkeys.lastUsed", { date: formatDate(p.LastUsedAt) })
                      : t("profile.passkeys.neverUsed")}
                    {" · "}
                    {t("profile.passkeys.created", { date: formatDate(p.CreatedAt) })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("profile.passkeys.removeLabel", { name: p.Name })}
                    onClick={() => { setRemoveError(""); setRemovePasswordError(null); setRemovePassword(""); setRemoveTarget(p) }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {supported ? (
          <Button
            variant="outline"
            onClick={() => { setAddError(""); setAddPasswordError(null); setAddNameError(null); setAddName(""); setAddPassword(""); setAddOpen(true) }}
          >
            {t("profile.passkeys.add")}
          </Button>
        ) : (
          <p className="text-sm text-dim">{t("profile.passkeys.unsupported")}</p>
        )}

        <ConfirmDialog
          open={addOpen}
          onCancel={() => setAddOpen(false)}
          busy={addBusy}
          busyLabel={t("common.busy.adding")}
          error={addError}
          title={t("profile.passkeys.addTitle")}
          description={t("profile.passkeys.addBody")}
          confirmLabel={t("profile.passkeys.addConfirm")}
          disabled={account.HasPassword && !addPassword}
          onConfirm={() => void add()}
        >
          <div className="space-y-2">
            <Label htmlFor="passkey-add-name">{t("profile.passkeys.name")}</Label>
            <Input
              id="passkey-add-name"
              value={addName}
              maxLength={NAME_MAX}
              placeholder={t("profile.passkeys.namePlaceholder")}
              aria-invalid={Boolean(addNameError)}
              aria-describedby={addNameError ? "passkey-add-name-error" : undefined}
              disabled={addBusy}
              onChange={(e) => { setAddName(e.target.value); setAddNameError(null) }}
            />
            {addNameError && <p id="passkey-add-name-error" role="alert" className="text-xs font-medium text-destructive">{addNameError}</p>}
          </div>
          {account.HasPassword && (
            <ReauthPasswordField
              id="passkey-add-password"
              hint={t("profile.passkeys.passwordHint")}
              value={addPassword}
              error={addPasswordError}
              onChange={(value) => { setAddPassword(value); setAddPasswordError(null) }}
              disabled={addBusy}
            />
          )}
        </ConfirmDialog>

        <ConfirmDialog
          open={removeTarget !== null}
          onCancel={() => setRemoveTarget(null)}
          tone="danger"
          busy={removeBusy}
          busyLabel={t("common.busy.removing")}
          error={removeError}
          title={t("profile.passkeys.removeTitle")}
          description={removeTarget ? <>{t("profile.passkeys.removeBody")} <b className="font-medium text-ink">{removeTarget.Name}</b></> : undefined}
          confirmLabel={t("profile.passkeys.removeConfirm")}
          disabled={account.HasPassword && !removePassword}
          onConfirm={() => void remove()}
        >
          {account.HasPassword && (
            <ReauthPasswordField
              id="passkey-remove-password"
              hint={t("profile.passkeys.passwordHint")}
              value={removePassword}
              error={removePasswordError}
              onChange={(value) => { setRemovePassword(value); setRemovePasswordError(null) }}
              disabled={removeBusy}
            />
          )}
        </ConfirmDialog>
      </CardContent>
    </Card>
  )
}
