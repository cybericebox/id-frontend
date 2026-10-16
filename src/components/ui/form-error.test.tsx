import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ApiError } from "@/api/client"
import { localizedError } from "@/i18n/apiError"
import { fieldErrorMessage, reportFieldOrFormError } from "./form-error"
import { ReauthPasswordField } from "@/components/profile/ReauthPasswordField"

vi.mock("@/components/ui/toast", () => ({ toast: { error: vi.fn() } }))

describe("field-specific API errors", () => {
  it("routes only an explicitly mapped stable error code to its field", () => {
    const field = vi.fn()
    const global = vi.fn()
    const error = new ApiError(400, null, undefined, undefined, 20410)
    reportFieldOrFormError(error, global, field, { 20410: "CurrentPassword" })
    expect(field).toHaveBeenCalledWith("CurrentPassword", { type: "server", message: localizedError(error) }, { shouldFocus: true })
    expect(global).not.toHaveBeenCalled()
  })

  it("leaves ambiguous credential, token and unknown errors on the form", () => {
    for (const code of [60401, 20502, 20000]) {
      const field = vi.fn()
      const global = vi.fn()
      const error = new ApiError(400, null, undefined, undefined, code)
      reportFieldOrFormError(error, global, field, { 20410: "CurrentPassword" })
      expect(field).not.toHaveBeenCalled()
      expect(global).toHaveBeenCalledWith(localizedError(error))
    }
    expect(fieldErrorMessage(new ApiError(500, null, undefined, undefined, 20410), [20410])).toBeNull()
  })

  it("renders reauthentication feedback directly after the password with a description link", () => {
    const html = renderToStaticMarkup(<ReauthPasswordField id="reauth" hint="hint" value="" onChange={vi.fn()} error="wrong" />)
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-describedby="reauth-error"')
    expect(html).toContain('id="reauth-error" role="alert"')
    expect(html.indexOf('id="reauth-error"')).toBeGreaterThan(html.indexOf('id="reauth"'))
  })
})
