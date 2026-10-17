import { describe, it, expect } from "vitest"
import { ApiError } from "@/api/client"
import { localizedError, waitText } from "./apiError"
import { t } from "./t"
import uk from "../../messages/uk.json"
import en from "../../messages/en.json"

const apiErr = (status: number, code: number | undefined, retryAfter?: number) =>
  new ApiError(status, undefined, undefined, undefined, code, retryAfter)

describe("localizedError", () => {
  it("handles the bodiless 429 of the rate limiter", () => {
    expect(localizedError(apiErr(429, undefined, 30))).toContain("30 с")
  })

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

  it("answers an overload 503 (with Retry-After) with the overloaded message", () => {
    expect(localizedError(apiErr(503, undefined, 1))).toBe(t("error.overloaded"))
    expect(localizedError(apiErr(503, 10503, 1))).toBe(t("error.overloaded"))
    // A 503 without Retry-After is an outage, not an overload.
    expect(localizedError(apiErr(503, undefined))).toBe(t("error.unavailable"))
    // A 429 keeps the rate-limit text.
    expect(localizedError(apiErr(429, undefined, 30))).toContain("30 с")
    // A domain 503 with a catalog message keeps the existing answer.
    expect(localizedError(apiErr(503, 20225, 1))).not.toBe(t("error.overloaded"))
    expect((uk as Record<string, string>)["error.overloaded"]).toBe("Сервер перевантажений, спробуйте за кілька секунд")
    expect((en as Record<string, string>)["error.overloaded"]).toBe("The server is overloaded, try again in a few seconds")
    expect((uk as Record<string, string>)["error.overloaded.retry"]).toBe("Спробувати ще раз")
    expect((en as Record<string, string>)["error.overloaded.retry"]).toBe("Try again")
  })
})
