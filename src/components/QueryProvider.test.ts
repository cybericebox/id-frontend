import { describe, expect, it } from "vitest"
import { createQueryClient } from "./QueryProvider"

describe("createQueryClient", () => {
  it("does not retry queries: the fetch layer retries overload answers itself", () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(false)
  })
})
