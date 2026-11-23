import { useMemo } from "react"
import { correction, generate } from "lean-qr"
import { toSvgPath } from "lean-qr/extras/svg"

// The quiet zone around the code, in modules (ISO/IEC 18004 asks for 4).
const QUIET = 4

/** The modules of a QR code as one SVG path, or null when the value cannot be encoded (too long, say). */
function encode(value: string): { d: string; n: number } | null {
  try {
    const code = generate(value, { minCorrectionLevel: correction.M })
    return { d: toSvgPath(code), n: code.size }
  } catch {
    return null
  }
}

/**
 * A QR code drawn as one SVG path (lean-qr). Always dark on white, whatever the theme: scanners need the contrast.
 * The value is never put into the markup as text, only as the drawn modules. When it cannot be encoded the
 * `fallback` renders instead (the caller shows the same data another way, e.g. the key to type in).
 */
export function QrCode({ value, label, size = 192, className, fallback = null }: {
  value: string
  label: string
  size?: number
  className?: string
  fallback?: React.ReactNode
}) {
  const qr = useMemo(() => encode(value), [value])
  if (!qr) return <>{fallback}</>
  const box = qr.n + QUIET * 2
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-QUIET} ${-QUIET} ${box} ${box}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x={-QUIET} y={-QUIET} width={box} height={box} fill="#fff" />
      <path d={qr.d} fill="#000" />
    </svg>
  )
}
