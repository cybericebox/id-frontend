# id-frontend

The sign-in and account app of the Cyber ICE Box platform: login, registration, password reset and profile. Other apps redirect here to authenticate.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query, react-hook-form with Zod, ECharts, reCAPTCHA v3. Tests: Vitest and Playwright. Lint: ESLint 10.

## Prerequisites

Node.js 26 or newer (see `.nvmrc`).

## Commands

```bash
npm install
npm run dev          # dev server on http://localhost:3001
npm run build        # production build (static export to out/)
npm run lint
npm run typecheck
npm test             # Vitest
npm run test:e2e     # Playwright
```

## Static export

Production builds are a **static export** (`output: "export"`, written to `out/`) and need no Node server at runtime; `npm run dev` runs the regular Next.js dev server. `npm start` is `next start` and is only meaningful outside the static build.

## Configuration

`NEXT_PUBLIC_*` values are inlined at build time; the container image substitutes them at start-up, so one image serves any environment.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_DOMAIN` | yes | Platform apex domain; the other hosts derive from it. |
| `NEXT_PUBLIC_API_DOMAIN` | no | API host (bare host, no scheme). Defaults to `api.<domain>`. |
| `NEXT_PUBLIC_ID_DOMAIN` | no | ID app host. Defaults to `id.<domain>`. |
| `NEXT_PUBLIC_ADMIN_DOMAIN` | no | Admin app host. Defaults to `admin.<domain>`. |
| `NEXT_PUBLIC_EXERCISES_DOMAIN` | no | Exercises app host. Defaults to `exercises.<domain>`. |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | no | Google Analytics 4 measurement id. Analytics is off when unset. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | in production | reCAPTCHA site key. reCAPTCHA is skipped when unset (local development). |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE` | no | `true` to use reCAPTCHA Enterprise; must match the backend mode. |

Test-only: `E2E_BASE_URL`, `E2E_CHROME_PATH`.

## i18n

All user-facing text lives in `messages/uk.json` and `messages/en.json` and is rendered through the translate function `t("key", { vars })`. Ukrainian is the default language. Every key must exist in both files.

## Deployment

Deployment and cluster configuration: see the infrastructure repository.
