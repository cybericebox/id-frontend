"use client"

import React, { useState } from "react"
import { Copy, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { t } from "@/i18n/t"
import { recoveryCodesText } from "@/lib/stepUp"

const FILE_NAME = "cybericebox-recovery-codes.txt"

/**
 * The recovery codes, shown this once (only their hashes are stored). Copy and download; the dialog closes only after
 * the person says the codes are saved, so a stray Esc or click outside cannot lose them.
 */
export function RecoveryCodesDialog({ codes, email, onDone }: { codes: string[] | null; email: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false)
  const open = codes !== null && codes.length > 0
  const text = () => recoveryCodesText(codes ?? [], [t("recoveryCodes.fileTitle", { email }), t("recoveryCodes.fileNote")])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text())
      toast.success(t("recoveryCodes.copied"))
    } catch {
      toast.error(t("recoveryCodes.copyFailed"))
    }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([text()], { type: "text/plain;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = FILE_NAME
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  const done = () => { setSaved(false); onDone() }
  const keepOpen = (event: Event) => { if (!saved) event.preventDefault() }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && saved) done() }}>
      <DialogContent className="max-w-md" onEscapeKeyDown={keepOpen} onInteractOutside={keepOpen}>
        <DialogHeader>
          <DialogTitle>{t("recoveryCodes.showTitle")}</DialogTitle>
          <DialogDescription>{t("recoveryCodes.showBody")}</DialogDescription>
        </DialogHeader>
        <ol aria-label={t("recoveryCodes.list")} className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border bg-paper p-4 font-mono text-sm text-ink">
          {(codes ?? []).map((code) => <li key={code} className="select-all whitespace-nowrap">{code}</li>)}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copy()}><Copy aria-hidden="true" />{t("common.copy")}</Button>
          <Button type="button" variant="outline" onClick={download}><Download aria-hidden="true" />{t("common.download")}</Button>
        </div>
        <Checkbox id="recovery-codes-saved" checked={saved} onChange={(e) => setSaved(e.target.checked)} label={t("recoveryCodes.saved")} />
        <DialogFooter>
          <Button type="button" disabled={!saved} onClick={done}>{t("recoveryCodes.done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
