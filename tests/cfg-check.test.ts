// The rule for the optional installation settings: the TypeScript one (next.config) and the shell one (deploy/cfg-check.sh, the container
// entrypoint and the Pages workflow) agree with the shared vectors (tests/cfg-vectors.json, identical in every repository).
import { describe, expect, it } from "vitest"
import { spawnSync } from "node:child_process"
import path from "node:path"
import vectors from "./cfg-vectors.json"
import { flagSettingError, urlSettingError } from "@/lib/settingRules"

const SCRIPT = path.resolve(import.meta.dirname, "../deploy/cfg-check.sh")

function shellAccepts(fn: "cfg_url_check" | "cfg_flag_check", value: string): boolean {
  const run = spawnSync("sh", ["-c", `. "${SCRIPT}"; ${fn} CFG_VALUE`], { env: { ...process.env, CFG_VALUE: value } })
  return run.status === 0
}

describe("url setting rule", () => {
  it.each(vectors.url)("TypeScript: $value", ({ value, valid }) => {
    expect(urlSettingError(value) === null).toBe(valid)
  })
  it.each(vectors.url)("shell: $value", ({ value, valid }) => {
    expect(shellAccepts("cfg_url_check", value)).toBe(valid)
  })
})

describe("flag setting rule", () => {
  it.each(vectors.flag)("TypeScript: $value", ({ value, valid }) => {
    expect(flagSettingError(value) === null).toBe(valid)
  })
  it.each(vectors.flag)("shell: $value", ({ value, valid }) => {
    expect(shellAccepts("cfg_flag_check", value)).toBe(valid)
  })
})

it("an unset variable is valid for both rules", () => {
  const run = spawnSync("sh", ["-c", `. "${SCRIPT}"; cfg_url_check UNSET_NAME && cfg_flag_check UNSET_NAME`], { env: { ...process.env } })
  expect(run.status).toBe(0)
})
