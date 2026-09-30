// Static-export-safe i18n wrapper.
// Build-time JSON import — no runtime locale provider, no locale switching.
//
// Two catalogs are maintained: messages/en.json (source of truth for the key set)
// and messages/uk.json (the ACTIVE language). The UI ships in Ukrainian; English
// is kept in sync as the reference/fallback. To switch the active language, change
// the `active` import below. Copy both catalogs to other apps per the DS sync
// procedure (see README).
import en from "../../messages/en.json"
import uk from "../../messages/uk.json"
import { createElement, Fragment, type ReactNode } from "react"
import { keepBrand } from "./brand"

// `en` defines the canonical key set; `uk` is what users see.
const active = uk

// BCP-47 locale of the active language — use for Intl/date formatting so dates
// match the UI language (e.g. Ukrainian month names) instead of the browser default.
export const locale = "uk-UA"
const fallback = en

type MessageKey = keyof typeof en

/**
 * Translate a message key to the active-language (Ukrainian) string.
 * Falls back to English, then to the key itself (safe for static export).
 * `{name}` placeholders are filled from `vars`.
 */
export function t(key: MessageKey | string, vars?: Record<string, string | number>): string {
  const msg = (active as Record<string, string>)[key] ?? (fallback as Record<string, string>)[key] ?? key
  if (!vars) return keepBrand(msg)
  return keepBrand(msg.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)))
}

/**
 * Like t(), but placeholders may be elements (a link): returns the text split
 * around them (keyed fragments), ready to render as children.
 */
export function tRich(key: MessageKey | string, vars: Record<string, ReactNode>): ReactNode[] {
  return richParts(t(key), vars)
}

function richParts(text: string, vars: Record<string, ReactNode>): ReactNode[] {
  return text
    .split(/(\{\w+\})/)
    .map((part, i) => {
      const name = /^\{(\w+)\}$/.exec(part)?.[1]
      // the split of a fixed message never reorders, so the position is a stable key
      // eslint-disable-next-line @eslint-react/no-array-index-key
      return createElement(Fragment, { key: i }, name !== undefined && name in vars ? vars[name] : part)
    })
}

/**
 * tRich for a « · »-separated credit line: each segment becomes an unbreakable
 * (nowrap) span and keeps its trailing dot, so lines break only after a separator.
 * `groupFrom` glues the segments from that index on into one inline-block group:
 * the group moves to the next line whole and splits (at its dots) only when it
 * cannot fit a line by itself.
 */
export function tSegments(
  key: MessageKey | string,
  vars: Record<string, ReactNode>,
  { groupFrom }: { groupFrom?: number } = {}
): ReactNode[] {
  const parts = t(key).split(" · ")
  const last = parts.length - 1
  const segment = (part: string, i: number): ReactNode[] => [
    // segments of a fixed message never reorder, so the position is a stable key
    // eslint-disable-next-line @eslint-react/no-array-index-key
    createElement("span", { key: i, style: { whiteSpace: "nowrap" } }, ...richParts(part, vars), i < last ? " ·" : null),
    i < last ? " " : null,
  ]
  if (groupFrom === undefined || groupFrom <= 0 || groupFrom > last) return parts.flatMap(segment)
  return [
    ...parts.slice(0, groupFrom).flatMap(segment),
    createElement(
      "span",
      { key: "group", style: { display: "inline-block" } },
      ...parts.slice(groupFrom).flatMap((part, j) => segment(part, groupFrom + j))
    ),
  ]
}
