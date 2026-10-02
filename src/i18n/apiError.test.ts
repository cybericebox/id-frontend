import { describe, it, expect } from "vitest"
import { ApiError } from "@/api/client"
import { localizedError, waitText } from "./apiError"

const apiErr = (status: number, code: number, retryAfter?: number) =>
  new ApiError(status, undefined, undefined, undefined, code, retryAfter)

describe("localizedError", () => {
  it("shows the wait of a 429 from Retry-After", () => {
    expect(localizedError(apiErr(429, 70428, 30))).toContain("30 с")
    expect(localizedError(apiErr(429, 70428, 90))).toContain("2 хв")
  })

  it("falls back to a plain message without Retry-After", () => {
    expect(localizedError(apiErr(429, 70428))).not.toContain("{")
  })

  it("maps the new auth codes", () => {
    for (const code of [20424, 20425, 20426, 20427, 60429]) {
      expect(localizedError(apiErr(400, code))).not.toBe("Щось пішло не так")
    }
  })

  it("rounds waits up", () => {
    expect(waitText(0.2)).toBe("1 с")
    expect(waitText(61)).toBe("2 хв")
  })
})
