import { describe, expect, it } from "vitest"

import { lastActivityLine } from "./sessionMeta"

describe("lastActivityLine", () => {
  it("shows the address when the session has one", () => {
    const line = lastActivityLine("203.0.113.5", "D")
    expect(line).toContain("203.0.113.5")
    expect(line).toContain("D")
  })
  it.each(["", "  ", null, undefined])("hides the address line when it is %j", (ip) => {
    const line = lastActivityLine(ip, "D")
    expect(line).toContain("D")
    expect(line).not.toContain("·")
    expect(line).not.toContain("{")
  })
})
