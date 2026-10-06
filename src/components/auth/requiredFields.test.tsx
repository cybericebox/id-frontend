import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { useForm } from "react-hook-form"

import uk from "../../../messages/uk.json"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DEFAULT_PASSWORD_POLICY } from "@/lib/passwordPolicy"
import { buildSetupSchema } from "./setupSchema"

const src = (name: string) => readFileSync(new URL(`./${name}.tsx`, import.meta.url), "utf8")

function Field({ required }: { required?: boolean }) {
  const form = useForm({ defaultValues: { a: "" } })
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="a"
        render={({ field }) => (
          <FormItem>
            <FormLabel required={required}>Label</FormLabel>
            <FormControl>
              <Input required={required} {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </Form>
  )
}

const schema = (hasGoogle = false) => buildSetupSchema({ current: hasGoogle }, { current: DEFAULT_PASSWORD_POLICY })
const valid = { FirstName: "A", LastName: "B", Password: "Abcdef12!", ConfirmPassword: "Abcdef12!", AcceptTos: true }
const messages = (v: object, hasGoogle = false): Record<string, string> => {
  const r = schema(hasGoogle).safeParse(v)
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]))
}

describe("required-field asterisks", () => {
  it("marks a required label with an aria-hidden star and the control with required", () => {
    const html = renderToStaticMarkup(<Field required />)
    expect(html).toContain('<span aria-hidden="true" class="ml-0.5 text-danger">*</span>')
    expect(html).toMatch(/<input[^>]*required/)
  })

  it("leaves an optional field unmarked", () => {
    const html = renderToStaticMarkup(<Field />)
    expect(html).not.toContain("*")
    expect(html).not.toMatch(/<input[^>]*required/)
  })

  it("marks a required checkbox label", () => {
    const html = renderToStaticMarkup(<Checkbox required label="Accept" />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain(">*<")
    expect(renderToStaticMarkup(<Checkbox label="Accept" />)).not.toContain("*")
  })

  it("is applied on the sign-up and setup forms and not on the sign-in page", () => {
    expect(src("SignUpScreen")).toMatch(/<FormLabel required>\{t\("common\.email"\)/)
    const setup = src("SetupScreen")
    for (const key of ["setup.firstName", "setup.lastName"]) expect(setup).toContain(`<FormLabel required>{t("${key}")`)
    expect(setup).toContain('<FormLabel required={!hasGoogle}>{t("setup.setPassword")')
    expect(setup).toContain('<FormLabel required={confirmRequired}>{t("setup.confirmPassword")')
    expect(setup).toMatch(/<Checkbox[\s\S]*?\n\s*required\n/)
    expect(src("SignInScreen")).not.toMatch(/<FormLabel required|RequiredMark|<Input[^>]*required/)
  })
})

describe("setup validation", () => {
  it("accepts a complete form", () => {
    expect(messages(valid)).toEqual({})
  })

  it("shows an inline error when the confirmation does not match", () => {
    expect(messages({ ...valid, ConfirmPassword: "other" }).ConfirmPassword).toBe(uk["validation.passwordsNoMatch"])
  })

  it("requires the confirmation when it is empty", () => {
    expect(messages({ ...valid, ConfirmPassword: "" }).ConfirmPassword).toBe(uk["validation.required"])
  })

  it("requires the policy checkbox", () => {
    expect(messages({ ...valid, AcceptTos: false }).AcceptTos).toBe(uk["validation.tosRequired"])
  })

  it("requires a password unless Google is linked", () => {
    const empty = { ...valid, Password: "", ConfirmPassword: "" }
    expect(messages(empty).Password).toBeTruthy()
    expect(messages(empty).ConfirmPassword).toBeTruthy()
    expect(messages(empty, true)).toEqual({})
  })
})
