// Copies the shared design system (docs/design-system of the monorepo) into this app.
//   node scripts/sync-ds.mjs           write the copies and src/styles/ds/manifest.json
//   node scripts/sync-ds.mjs --check   exit 1 on drift (CI)
// The DS is copied, never imported. The DS folder is not in this repository, so the check has two levels:
//   1. always: every copy still has the sha256 recorded in manifest.json (no hand edits, no half-synced files);
//   2. when the DS source is reachable (DS_DIR, docs/design-system in the monorepo checkout, ds-source/):
//      every copy equals what the sync would write from it.
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const srcDir = join(root, "src")
const manifestPath = join(srcDir, "styles/ds/manifest.json")
const check = process.argv.includes("--check")
const sha = (text) => createHash("sha256").update(text).digest("hex")

const up = Array.from({ length: 5 }, (_, i) => join(root, ...Array(i + 1).fill(".."), "docs/design-system"))
const src = [process.env.DS_DIR, ...up, join(root, "ds-source")].filter(Boolean).find((d) => existsSync(join(d, "tokens.css")))

// copy (relative to src/) → source file in the DS
const files = {
  "styles/ds-tokens.css": "tokens.css",
  "components/ui/tooltip.css": "components/tooltip/tooltip.css",
}

const HEADER = "/* copied from docs/design-system, do not edit: node scripts/sync-ds.mjs */\n"

function transform(name, css) {
  if (name === "styles/ds-tokens.css") {
    // fonts come from next/font (geist): @font-face goes, the family vars point at its variables
    const body = css
      .split("\n")
      .filter((l) => !l.startsWith("@font-face"))
      .map((l) => l.replace('--ib-font:"Geist",', '--ib-font:var(--font-geist-sans),"Geist",').replace('--ib-mono:"Geist Mono",', '--ib-mono:var(--font-geist-mono),"Geist Mono",'))
      .join("\n")
    return HEADER + "/* Change vs source: @font-face removed, --ib-font/--ib-mono point at the next/font Geist variables (geist package). */\n" + body
  }
  return HEADER + css
}

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {}

if (check) {
  let drift = 0
  for (const dst of Object.keys(files)) {
    const target = join(srcDir, dst)
    const cur = existsSync(target) ? readFileSync(target, "utf8") : ""
    if (sha(cur) !== manifest[dst]) {
      console.error(`ds drift: src/${dst} does not match manifest.json (edited by hand or not synced)`)
      drift++
    }
    if (src && cur !== transform(dst, readFileSync(join(src, files[dst]), "utf8"))) {
      console.error(`ds drift: src/${dst} differs from docs/design-system/${files[dst]}`)
      drift++
    }
  }
  if (!src) console.log("ds check: design system source not found, manifest check only")
  if (drift) {
    console.error("run: node scripts/sync-ds.mjs and commit the result")
    process.exit(1)
  }
} else {
  if (!src) {
    console.error("design system source not found (set DS_DIR)")
    process.exit(1)
  }
  const next = {}
  for (const [dst, from] of Object.entries(files)) {
    const text = transform(dst, readFileSync(join(src, from), "utf8"))
    next[dst] = sha(text)
    const target = join(srcDir, dst)
    if (existsSync(target) && readFileSync(target, "utf8") === text) continue
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, text)
    console.log(`synced ${dst}`)
  }
  mkdirSync(dirname(manifestPath), { recursive: true })
  writeFileSync(manifestPath, JSON.stringify(next, null, 2) + "\n")
}
