import { useMemo } from "react"
import { correction, generate } from "lean-qr"
import { toSvgPath } from "lean-qr/extras/svg"

// The quiet zone around the code, in modules (ISO/IEC 18004 asks for 4).
const QUIET = 4

/**
 * A QR code drawn as one SVG path (lean-qr). Always dark on white, whatever the theme: scanners need the contrast.
 * The value is never put into the markup as text, only as the drawn modules.
 */
export function QrCode({ value, label, size = 192, className }: { value: string; label: string; size?: number; className?: string }) {
  const { d, n } = useMemo(() => {
    const code = generate(value, { minCorrectionLevel: correction.M })
    return { d: toSvgPath(code), n: code.size }
  }, [value])
  const box = n + QUIET * 2
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
      <path d={d} fill="#000" />
    </svg>
  )
}
