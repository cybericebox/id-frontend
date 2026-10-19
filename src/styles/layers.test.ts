/**
 * One layer scale (src/styles/layers.css): everything that floats over the page takes its z-index from it. The cookie
 * bar, the inbox pop-ins and the banners panel sit below the modal dialogs; toasts stay above them. Raw z-index
 * numbers are allowed only in the scale itself and in the copied DS files (tooltip, service-down) and the captcha box.
 */
import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const SRC = path.resolve(import.meta.dirname, "..")
const read = (file: string) => fs.readFileSync(path.join(SRC, file), "utf8")

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return files(file)
    return /\.(css|tsx?)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [file] : []
  })
}

const scale = Object.fromEntries(
  [...read("styles/layers.css").matchAll(/--z-([\w-]+)\s*:\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]),
)

describe("layer scale", () => {
  it("orders the layers: popovers < cookie bar < pop-ins < dialogs < tooltip < toasts", () => {
    const order = ["popover", "consent", "popin", "dialog", "tooltip", "toast", "skip", "service-down"]
    expect(Object.keys(scale).sort()).toEqual([...order].sort())
    for (let i = 1; i < order.length; i++) expect(scale[order[i]], order[i]).toBeGreaterThan(scale[order[i - 1]])
  })

  it("matches the DS copies that keep their own numbers", () => {
    expect(read("components/ui/tooltip.css")).toContain(`z-index:${scale.tooltip}`)
    expect(read("components/ui/service-down.css")).toContain(`z-index:${scale["service-down"]}`)
  })

  it("is the only source of z-index numbers in the app", () => {
    const allowed = new Set(["styles/layers.css", "components/ui/tooltip.css", "components/ui/service-down.css", "lib/captcha.ts"])
    const hits: string[] = []
    for (const file of files(SRC)) {
      const rel = path.relative(SRC, file)
      if (allowed.has(rel)) continue
      const text = fs.readFileSync(file, "utf8")
      for (const m of text.matchAll(/z-index\s*:\s*\d+|(?<![\w-])z-(?:\d+|\[\d+\])(?![\w-])/g)) hits.push(`${rel}: ${m[0]}`)
    }
    expect(hits).toEqual([])
  })

  it("puts each floating layer on its step", () => {
    expect(read("components/ui/dialog.tsx").match(/z-\[var\(--z-dialog\)\]/g)).toHaveLength(2)
    expect(read("styles/consent.css")).toMatch(/\.cb-consent\{[^}]*z-index:var\(--z-consent\)/)
    expect(read("styles/site-banner.css")).toMatch(/\.ib-site-banner-panel\{[^}]*z-index:var\(--z-popover\)/)
    expect(read("components/profile/InboxButton.tsx")).toContain("z-[var(--z-popin)]")
    expect(read("components/ui/toast.tsx")).toContain("z-[var(--z-toast)]")
  })
})
