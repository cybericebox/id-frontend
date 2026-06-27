"use client"

import React, { useCallback, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { t } from "@/i18n/t"

// loadImage resolves an HTMLImageElement for the given (object) URL.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", reject)
    img.src = src
  })
}

// cropToBlob draws the selected pixel region onto a square canvas and returns a
// JPEG blob ready for upload. Output is capped at 512×512 to keep avatars small.
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src)
  const size = Math.min(512, Math.round(area.width))
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas unavailable")
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.9
    )
  })
}

export function AvatarCropDialog({
  open,
  imageSrc,
  onCancel,
  onConfirm,
}: {
  open: boolean
  imageSrc: string | null
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !areaPixels) return
    setBusy(true)
    try {
      const blob = await cropToBlob(imageSrc, areaPixels)
      onConfirm(blob)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profile.profile.cropTitle")}</DialogTitle>
        </DialogHeader>

        {imageSrc && (
          <div className="relative h-64 w-full overflow-hidden rounded-md bg-muted">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {t("profile.profile.cropZoom")}
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {t("profile.profile.cropCancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={busy || !areaPixels}>
            {busy ? t("common.loading") : t("profile.profile.cropSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
