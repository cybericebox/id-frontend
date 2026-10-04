// Bot-check provider helper: loads the configured provider script once and executes an action.
// Provider: NEXT_PUBLIC_CAPTCHA_PROVIDER = turnstile | recaptcha | none (default none).
// The values are placeholders baked at build and substituted at container start, so they are never
// compared with `===` against a literal (that would be folded at build): includes() keeps them runtime.
// reCAPTCHA mode is derived: Enterprise iff NEXT_PUBLIC_RECAPTCHA_PROJECT (Google Cloud project id) is non-empty.
// Each env var is read as a plain `process.env.NEXT_PUBLIC_X` expression so Next inlines it.

export type CaptchaProvider = "turnstile" | "recaptcha" | "none"

export const NONE_TOKEN = "none"
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
const EXECUTE_TIMEOUT_MS = 30_000

type Recaptcha = {
  ready: (cb: () => void) => void
  execute: (key: string, opts: { action: string }) => Promise<string>
}
type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  execute: (widgetId: string) => void
  remove: (widgetId: string) => void
}
type CaptchaWindow = Window & {
  grecaptcha?: Recaptcha & { enterprise?: Recaptcha }
  turnstile?: Turnstile
}

export function captchaProvider(): CaptchaProvider {
  const raw = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? ""
  if (["turnstile"].includes(raw)) return "turnstile"
  if (["recaptcha"].includes(raw)) return "recaptcha"
  return "none"
}

function siteKey(): string {
  return process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? ""
}

function enterpriseOn(): boolean {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_PROJECT ?? "").trim() !== ""
}

const scripts = new Map<string, Promise<void>>()

function loadScript(src: string): Promise<void> {
  const cached = scripts.get(src)
  if (cached) return cached
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script")
    el.src = src
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => {
      scripts.delete(src)
      el.remove()
      reject(new Error("captcha script failed to load"))
    }
    document.head.appendChild(el)
  })
  scripts.set(src, p)
  return p
}

function recaptchaSrc(): string {
  const file = enterpriseOn() ? "enterprise.js" : "api.js"
  return `https://www.google.com/recaptcha/${file}?render=${encodeURIComponent(siteKey())}`
}

/** Loads the provider script ahead of time (no-op for none). Safe to call many times. */
export function preloadCaptcha(): void {
  if (typeof document === "undefined") return
  const provider = captchaProvider()
  const src = provider === "turnstile" ? TURNSTILE_SRC : provider === "recaptcha" ? recaptchaSrc() : ""
  if (src) loadScript(src).catch(() => {})
}

async function executeRecaptcha(action: string): Promise<string> {
  await loadScript(recaptchaSrc())
  const w = window as CaptchaWindow
  const client = enterpriseOn() ? w.grecaptcha?.enterprise : w.grecaptcha
  if (!client) throw new Error("reCAPTCHA is unavailable")
  await new Promise<void>((resolve) => client.ready(resolve))
  return client.execute(siteKey(), { action })
}

async function executeTurnstile(action: string): Promise<string> {
  await loadScript(TURNSTILE_SRC)
  const ts = (window as CaptchaWindow).turnstile
  if (!ts) throw new Error("Turnstile is unavailable")
  const box = document.createElement("div")
  // Interaction-only: the widget is invisible unless Cloudflare needs the user to interact.
  box.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647"
  document.body.appendChild(box)
  let widgetId: string | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const cleanup = () => {
    if (timer) clearTimeout(timer)
    if (widgetId !== undefined) {
      try {
        ts.remove(widgetId)
      } catch {
        // already gone
      }
    }
    box.remove()
  }
  return new Promise<string>((resolve, reject) => {
    timer = setTimeout(() => {
      cleanup()
      reject(new Error("Turnstile timed out"))
    }, EXECUTE_TIMEOUT_MS)
    try {
      widgetId = ts.render(box, {
        sitekey: siteKey(),
        action,
        appearance: "interaction-only",
        execution: "execute",
        callback: (token: string) => {
          cleanup()
          resolve(token)
        },
        "error-callback": () => {
          cleanup()
          reject(new Error("Turnstile failed"))
        },
      })
      ts.execute(widgetId)
    } catch (err) {
      cleanup()
      reject(err instanceof Error ? err : new Error("Turnstile failed"))
    }
  })
}

/** Executes the bot check for `action` and resolves with the token (sent as RecaptchaToken). */
export async function executeCaptcha(action: string): Promise<string> {
  switch (captchaProvider()) {
    case "turnstile":
      return executeTurnstile(action)
    case "recaptcha":
      return executeRecaptcha(action)
    default:
      return NONE_TOKEN
  }
}
