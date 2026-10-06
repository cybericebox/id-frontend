/**
 * Guard for the owner rules in CLAUDE.md:
 * (1) user-facing text comes from messages/*.json through t() — no Cyrillic string
 *     literals or JSX text in src, no Latin JSX text, no literal aria-label / title /
 *     placeholder / alt;
 * (2) every loading state is the crest loader — no lucide Loader2, no animate-spin.
 * Comments are ignored (the scan walks the AST). Tests are skipped.
 */
import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const SRC = path.resolve(import.meta.dirname, "..")

// Each entry needs a reason. `file` is relative to src/.
const ALLOW: { file: string; text: string; reason: string }[] = [
  { file: "components/brand/Wordmark.tsx", text: "ICE", reason: "brand wordmark lockup" },
  { file: "components/auth/AuthSidePanel.tsx", text: "ICE", reason: "brand wordmark lockup" },
]

const TEXT_ATTRS = new Set(["aria-label", "title", "placeholder", "alt"])
const CYRILLIC = /\p{Script=Cyrillic}/u
const LETTER = /\p{L}/u

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(p)
    return /\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name) ? [p] : []
  })
}

type Hit = { file: string; line: number; text: string; why: string }

function scan(file: string): Hit[] {
  const code = fs.readFileSync(file, "utf8")
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const rel = path.relative(SRC, file)
  const hits: Hit[] = []
  const add = (node: ts.Node, text: string, why: string) => {
    const trimmed = text.trim()
    if (ALLOW.some((a) => a.file === rel && a.text === trimmed)) return
    hits.push({ file: rel, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: trimmed, why })
  }
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (CYRILLIC.test(node.text)) add(node, node.text, "Cyrillic literal")
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      if (CYRILLIC.test(node.text)) add(node, node.text, "Cyrillic template text")
    } else if (ts.isJsxText(node)) {
      for (const part of node.text.split(/\s{2,}|\n/)) {
        if (LETTER.test(part)) add(node, part, "JSX text")
      }
    } else if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText(sf))) {
      const init = node.initializer
      const lit = init && ts.isStringLiteral(init) ? init
        : init && ts.isJsxExpression(init) && init.expression && (ts.isStringLiteral(init.expression) || ts.isTemplateExpression(init.expression) || ts.isNoSubstitutionTemplateLiteral(init.expression)) ? init.expression
          : undefined
      if (lit && LETTER.test(lit.getText(sf).replace(/\$\{[^}]*\}/g, ""))) add(node, lit.getText(sf), `literal ${node.name.getText(sf)}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return hits
}

const files = sourceFiles(SRC)

describe("no hardcoded UI text", () => {
  it("all user-facing text in src goes through t()", () => {
    const hits = files.flatMap(scan).map((h) => `${h.file}:${h.line} ${h.why}: ${h.text}`)
    expect(hits).toEqual([])
  })

  it("every allowlist entry still matches something", () => {
    for (const a of ALLOW) {
      expect(fs.readFileSync(path.join(SRC, a.file), "utf8"), `stale allowlist entry ${a.file}: ${a.text}`).toContain(a.text)
      expect(a.reason.trim()).not.toBe("")
    }
  })
})

describe("crest loader only", () => {
  it("uses no generic spinners", () => {
    const hits = files.filter((f) => /\bLoader2\b|animate-spin/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(SRC, f))
    expect(hits).toEqual([])
  })
})
