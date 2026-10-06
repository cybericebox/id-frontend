// Builds src/styles/ds-tokens.css from docs/design-system/tokens.css (copied, never imported).
// Local changes: @font-face dropped, --ib-font/--ib-mono point at the next/font Geist variables,
// --ib-shadow-overlay dropped (src/styles/noShadows.test.ts: this app has no shadows at all).
// `node scripts/sync-ds-tokens.mjs`         rewrites the copy
// `node scripts/sync-ds-tokens.mjs --check` fails when the copy drifted from the source (CI)
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const target = join(root, "src/styles/ds-tokens.css")
// the design system lives in the monorepo next to this repository (docs/design-system), found by walking up
const up = Array.from({ length: 5 }, (_, i) => join(root, ...Array(i + 1).fill(".."), "docs/design-system"))
const sources = [process.env.DS_DIR, ...up].filter(Boolean)
const dir = sources.find((d) => existsSync(join(d, "tokens.css")))
if (!dir) {
  console.log("design system not found next to this repository: drift check skipped")
  process.exit(0)
}

const header =
  "/* Copied from docs/design-system/tokens.css. Source of truth: docs/design-system — re-copy with scripts/sync-ds-tokens.mjs, do not edit values here.\n" +
  "   Change vs source: @font-face and --ib-shadow-overlay removed, --ib-font/--ib-mono point at the next/font Geist variables. */\n"

const body = readFileSync(join(dir, "tokens.css"), "utf8")
  .split("\n")
  .filter((l) => !l.startsWith("@font-face") && !l.includes("--ib-shadow-overlay:"))
  .join("\n")
  .replace('--ib-font:"Geist"', '--ib-font:var(--font-geist-sans),"Geist"')
  .replace('--ib-mono:"Geist Mono"', '--ib-mono:var(--font-geist-mono),"Geist Mono"')

const next = header + body
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== next) {
    console.error("src/styles/ds-tokens.css differs from docs/design-system/tokens.css: run node scripts/sync-ds-tokens.mjs")
    process.exit(1)
  }
} else {
  writeFileSync(target, next)
}
