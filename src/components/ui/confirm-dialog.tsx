"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { t } from "@/i18n/t"

// ds-v2 confirm dialog: a question as the title, one or two lines about the
// consequence, «Скасувати» + the action. tone="danger" makes the action the
// solid danger button. Focus starts on «Скасувати»; Esc and the backdrop
// cancel unless the action is running. Errors stay inside the dialog.
export function ConfirmDialog({ open, onCancel, title, description, confirmLabel, busyLabel, cancelLabel, tone = "default", busy = false, disabled = false, error, onConfirm, children }: {
  open: boolean
  onCancel: () => void
  title: string
  description?: React.ReactNode
  confirmLabel: string
  /** The running operation in the present tense («Видаляємо…»), shown in the confirm button while busy. */
  busyLabel: string
  cancelLabel?: string
  tone?: "default" | "danger"
  busy?: boolean
  disabled?: boolean
  error?: React.ReactNode
  onConfirm: () => void
  children?: React.ReactNode
}) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  return <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel() }}>
    <DialogContent className="max-w-md" onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus() }}
      {...(description ? {} : { "aria-describedby": undefined })}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      {/* a form, so Enter in the re-auth password field confirms; the cancel button is type="button" */}
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => { event.preventDefault(); if (!busy && !disabled) onConfirm() }}
      >
        {children}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button ref={cancelRef} type="button" variant="outline" disabled={busy} onClick={onCancel}>{cancelLabel ?? t("common.cancel")}</Button>
          <Button type="submit" variant={tone === "danger" ? "destructive" : "default"} busy={busy} busyLabel={busyLabel} disabled={disabled}>{confirmLabel}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
