/**
 * A placeholder is an example of the value, never a copy of the field label (it would repeat the label and, on a
 * narrow field, get cut by the «Показати» button). So no placeholder may equal any other text of the catalog.
 */
import { describe, expect, it } from "vitest"
import uk from "../../messages/uk.json"
import en from "../../messages/en.json"

describe("placeholders", () => {
  it.each([["uk", uk], ["en", en]] as const)("%s: no placeholder repeats a label", (_lang, catalog) => {
    const entries = Object.entries(catalog as Record<string, string>)
    const texts = new Set(entries.filter(([key]) => !key.endsWith("Placeholder")).map(([, value]) => value.trim().toLowerCase()))
    const repeats = entries.filter(([key, value]) => key.endsWith("Placeholder") && texts.has(value.trim().toLowerCase()))
    expect(repeats).toEqual([])
  })
})
