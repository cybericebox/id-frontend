// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { captchaProvider, executeCaptcha, NONE_TOKEN } from "@/lib/captcha"

describe("captcha provider", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    document.head.innerHTML = ""
  })

  it("defaults to none and never loads a script", async () => {
    expect(captchaProvider()).toBe("none")
    await expect(executeCaptcha("signIn")).resolves.toBe(NONE_TOKEN)
    expect(document.head.querySelectorAll("script")).toHaveLength(0)
  })

  it("selects the provider from the env", () => {
    vi.stubEnv("NEXT_PUBLIC_CAPTCHA_PROVIDER", "turnstile")
    expect(captchaProvider()).toBe("turnstile")
    vi.stubEnv("NEXT_PUBLIC_CAPTCHA_PROVIDER", "recaptcha")
    expect(captchaProvider()).toBe("recaptcha")
    vi.stubEnv("NEXT_PUBLIC_CAPTCHA_PROVIDER", "bogus")
    expect(captchaProvider()).toBe("none")
  })

  it("recaptcha: loads api.js once and executes the action", async () => {
    vi.stubEnv("NEXT_PUBLIC_CAPTCHA_PROVIDER", "recaptcha")
    vi.stubEnv("NEXT_PUBLIC_CAPTCHA_SITE_KEY", "KEY")
    const execute = vi.fn().mockResolvedValue("tok")
    ;(window as unknown as { grecaptcha: unknown }).grecaptcha = { ready: (cb: () => void) => cb(), execute }
    const p = Promise.all([executeCaptcha("signIn"), executeCaptcha("signUp")])
    await vi.waitFor(() => expect(document.head.querySelectorAll("script")).toHaveLength(1))
    const el = document.head.querySelector("script")!
    expect(el.src).toBe("https://www.google.com/recaptcha/api.js?render=KEY")
    el.onload?.(new Event("load"))
    await expect(p).resolves.toEqual(["tok", "tok"])
    expect(execute).toHaveBeenCalledWith("KEY", { action: "signIn" })
    expect(execute).toHaveBeenCalledWith("KEY", { action: "signUp" })
  })

  it("turnstile: renders an interaction-only widget, resolves the token, removes it", async () => {
    vi.stubEnv("NEXT_PUBLIC_CAPTCHA_PROVIDER", "turnstile")
    vi.stubEnv("NEXT_PUBLIC_CAPTCHA_SITE_KEY", "TKEY")
    const remove = vi.fn()
    const render = vi.fn((_el: HTMLElement, opts: { callback: (t: string) => void }) => {
      setTimeout(() => opts.callback("ttok"), 0)
      return "w1"
    })
    ;(window as unknown as { turnstile: unknown }).turnstile = { render, execute: vi.fn(), remove }
    const p = executeCaptcha("forgotPassword")
    await vi.waitFor(() => expect(document.head.querySelectorAll("script")).toHaveLength(1))
    const el = document.head.querySelector("script")!
    expect(el.src).toBe("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit")
    el.onload?.(new Event("load"))
    await expect(p).resolves.toBe("ttok")
    expect(render.mock.calls[0][1]).toMatchObject({
      sitekey: "TKEY",
      action: "forgotPassword",
      appearance: "interaction-only",
      execution: "execute",
    })
    expect(remove).toHaveBeenCalledWith("w1")
    expect(document.body.children).toHaveLength(0)
  })
})
