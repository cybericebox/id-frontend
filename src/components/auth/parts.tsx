import * as React from "react"
import Link from "next/link"

// Shared building blocks of the auth screens (ds-v2 auth-split form side).

// Form column content: fixed width, vertical rhythm.
export function AuthPane({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full max-w-[420px] flex-col gap-4">{children}</div>
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <header className="mb-2 flex flex-col gap-2">
      <h1 className="text-[32px] font-semibold leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-dim">{subtitle}</p>}
    </header>
  )
}

// «або» separator between the Google button and the email form.
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-faint">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

// Bottom line: «Немає акаунта? Зареєструватися».
// Links inside running text are told apart by an underline (WCAG 1.4.1), not by colour or weight alone (DS .ib-link:
// 1 px, 45 % of the text colour at rest, full colour on hover).
export const inlineLinkClass =
  "rounded-xs font-medium text-action underline decoration-current/45 decoration-1 underline-offset-3 hover:decoration-current"

export function AuthSwitch({ text, href, action }: { text?: string; href: string; action: string }) {
  return (
    <p className="mt-1 flex flex-wrap justify-center gap-2 text-[13px] text-dim">
      {text}
      <Link href={href} className={inlineLinkClass}>
        {action}
      </Link>
    </p>
  )
}

export const authLinkClass = `text-[13px] ${inlineLinkClass}`

// Google "G" mark (brand colours are Google's, not ours — allowed on its button).
export function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" style={{ width: 18, height: 18 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}
