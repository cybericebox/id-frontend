# id-frontend

The sign-in and account app of the Cyber ICE Box platform: login, registration, password reset and profile. Other apps redirect here to authenticate.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query, react-hook-form with Zod, ECharts, reCAPTCHA v3 or Cloudflare Turnstile. Tests: Vitest and Playwright. Lint: ESLint 10.

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
| `NEXT_PUBLIC_DOMAIN` | yes | The one base domain, a bare lowercase host name (no scheme, port or path). Every host derives from it: `<DOMAIN>` (landing), `api.`, `id.`, `admin.`, `exercises.<DOMAIN>`, event sites `<tag>.<DOMAIN>`, the shared theme and consent cookies on `.<DOMAIN>`. There are no per-host settings. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | yes | Support mailbox of the «Send feedback» `mailto:` link shown on every page (the subject carries the app and page path only). |
| `NEXT_PUBLIC_SHOW_PARTNERS` | no (default `true`) | `false` hides the partner links in the sign-in panel footer. |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | no | Google Analytics 4 measurement id. Analytics is off when unset. |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | yes | Bot-check provider: `turnstile`, `recaptcha` or `none` (local development, nothing is loaded). Must match the backend. |
| `NEXT_PUBLIC_CAPTCHA_SITE_KEY` | when the provider is not `none` | Public site key of the provider. |
| `NEXT_PUBLIC_RECAPTCHA_PROJECT` | no (default empty) | Google Cloud project id (not secret). Non-empty switches `recaptcha` to Enterprise, empty means classic v3; must match the backend mode. |
| `DEV_ALLOWED_ORIGINS` | no | Dev only: comma list for `allowedDevOrigins`; default is the configured hosts and `*.<event domain>`. |

Required: `NEXT_PUBLIC_DOMAIN`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_CAPTCHA_PROVIDER` (and the site key unless `none`). Everything else is optional. A missing required value fails the build (`next.config.ts`), the container start (entrypoint) and the Pages workflow. See `.env.example`.

Test-only: `E2E_BASE_URL`, `E2E_CHROME_PATH`.

## i18n

All user-facing text lives in `messages/uk.json` and `messages/en.json` and is rendered through the translate function `t("key", { vars })`. Ukrainian is the default language. Every key must exist in both files.

## Listeners and TLS (container)

The nginx image has baked defaults, so the deploy passes none of these: plain HTTP on 3000, a health listener on 8081, TLS on 8443 when `/tls/tls.crt` and `/tls/tls.key` exist, client certificates required when `/aop/ca.crt` exists. Every default can be overridden by env, read at container start by `deploy/nginx-entrypoint.sh`. The nginx config is in files under `deploy/nginx/` (`nginx.conf`, `server.conf`, and the snippets `listen-http.conf`, `listen-https.conf`, `client-auth.conf`, `health.conf`); the entrypoint only validates the env, renders the active snippets with `envsubst` into `/tmp/nginx-gen` (an empty file for each inactive one), and runs `nginx -t`, so a bad combination stops the container at start.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HTTP_PORT` | `3000` | Plain HTTP listener. Set but empty turns it off. |
| `HTTPS_PORT` | `8443` | TLS listener (HTTP/2); on only when the certificate and key are set (by default when `/tls/tls.crt` and `/tls/tls.key` exist). |
| `TLS_CERT_FILE`, `TLS_KEY_FILE` | `/tls/tls.crt`, `/tls/tls.key` when both files exist, else empty | PEM server certificate chain and key. Both set = TLS on; exactly one set = start error; set empty = TLS off. |
| `TLS_MIN_VERSION` | `1.2` | `1.2` or `1.3`. |
| `TLS_CLIENT_CA_FILE` | `/aop/ca.crt` when it exists, else empty | PEM bundle of the root (and intermediate) CAs that signed the client certificates. |
| `TLS_CLIENT_AUTH` | `require` when the CA file is the default `/aop/ca.crt` and TLS is on, else `off` | `off`, `optional` (verify when presented, the result is `$ssl_client_verify`) or `require`. `optional` and `require` need the CA file and TLS, else start error. A missing or invalid certificate gets the connection dropped (nginx 444). |
| `HEALTH_PORT` | `8081` | An extra plain-HTTP listener on `HEALTH_BIND` (default `0.0.0.0`) that serves only `/healthz` (everything else 404), for kubelet probes that cannot present a client certificate. Set empty = off. |
| `TLS_RELOAD_INTERVAL` | `60` | Seconds between checksum checks of the certificate, key and CA files. A change runs `nginx -t` and `nginx -s reload`, no restart; a config that fails the test keeps the running one and logs it. It polls (no inotify) because Kubernetes swaps a Secret mount through the `..data` symlink. |

`HTTP_PORT` empty with no TLS is a start error. With TLS on, the plain listener stays on unless `HTTP_PORT` is set empty; with `TLS_CLIENT_AUTH=require` the entrypoint warns about it, because the plain port is not protected by client certificates: set `HTTP_PORT=` and use `HEALTH_PORT` for probes. `scripts/test-nginx-tls.sh` (Docker) tests the whole matrix, including a live certificate replacement.

## Content Security Policy

The site sends a strict CSP: scripts only from the site itself (no inline script without a hash), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. `connect-src` allows the API host (`api.<NEXT_PUBLIC_DOMAIN>`) plus the vendors the app is configured for: Google Analytics when `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` is set, the chosen bot-check provider (`NEXT_PUBLIC_CAPTCHA_PROVIDER`: reCAPTCHA or Cloudflare Turnstile hosts only). `style-src` keeps `'unsafe-inline'` (React style attributes cannot be hashed).

The export is static, so a per-request nonce is not possible. Instead, at container start `deploy/csp.sh` (runs after the env substitution) hashes every inline `<script>` in the exported pages, plus the scripts the client creates at runtime (the Google Analytics boot; `scripts/csp-inline.mjs` writes its text at build time), and writes the header to `/tmp/nginx-gen/csp.conf`. `deploy/nginx/server.conf` includes that file in the server block and in every location that sets its own `add_header` (nginx does not inherit `add_header` into a location that defines one). A new inline script needs no manual step; a new runtime-created inline script must be added to `scripts/csp-inline.mjs`.

`next dev` sends the same policy from `headers()` in `next.config.ts`, only when `NODE_ENV=development`, with `'unsafe-inline'` and `'unsafe-eval'` for scripts and websockets for HMR. Check the browser console for `Content Security Policy` violations after adding a script, an iframe or a new external host.

## Deployment

Deployment and cluster configuration: see the infrastructure repository.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).

Copyright 2026 CyberICEBox

### One base domain

`NEXT_PUBLIC_DOMAIN` is the only host input and every host derives from it: main = `DOMAIN`, `api.DOMAIN`, `id.DOMAIN`, `admin.DOMAIN`, `exercises.DOMAIN`, event sites `<tag>.DOMAIN`, the cookie domain = `DOMAIN`. The code reads the derived hosts through one helper (`src/**/hosts.ts`); `deploy/base-domain.sh` (sourced by the container entrypoint and the Pages workflow) and the domain check in `next.config` reject an unset or malformed domain. `tests/base-domain-vectors.json` holds the shared test vectors that `tests/base-domain.test.ts` runs against all three; `deploy/base-domain.sh` and the vector file are copies kept identical in every frontend repository (the daemon and infrastructure have the same rule and the same vector file).
